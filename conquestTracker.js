// Conquest Tracker — v1.1
// Overlay de conquêtes sur la carte native de Guerre Tribale
// Sources : rapports de l'utilisateur + village.txt pour les nobles externes
// Auteur : Schadrac

var ConquestTracker = ConquestTracker || {};

(function ($) {

    var LS_PREFIX      = 'schadrac_conquestTracker';
    var FETCH_COOLDOWN = 60 * 60 * 1000; // 1h min entre deux fetch village.txt
    var svgNS          = 'http://www.w3.org/2000/svg';

    // ─── Couleurs par ancienneté ──────────────────────────────────────────────
    var AGE_COLORS = [
        { maxH: 1,   fill: '#e74c3c', stroke: '#c0392b', label: '< 1h'  }, // rouge vif
        { maxH: 3,   fill: '#e67e22', stroke: '#d35400', label: '1–3h'  }, // orange
        { maxH: 6,   fill: '#f1c40f', stroke: '#d4ac0d', label: '3–6h'  }, // jaune
        { maxH: 24,  fill: '#95a5a6', stroke: '#7f8c8d', label: '6–24h' }, // gris
        { maxH: 999, fill: '#bdc3c7', stroke: '#95a5a6', label: '> 24h' }, // gris clair
    ];

    // ─── État global ──────────────────────────────────────────────────────────
    var conquests   = []; // { coord, x, y, villageName, oldPlayer, newPlayer, ts, ageH, source }
    var overlay     = null;
    var panel       = null;
    var radiusField = 50;  // rayon en champs autour du centre de vue
    var filterAge   = 999; // filtre max ancienneté en heures
    var txtChanges  = []; // changements de propriétaire détectés via village.txt (persistés)

    // ─── Utilitaires ─────────────────────────────────────────────────────────

    function pad(n) { return ('0' + n).slice(-2); }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
            return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
    }

    function lsGet(key, def) {
        try { var v = localStorage.getItem(LS_PREFIX + key); return v === null ? def : JSON.parse(v); }
        catch (e) { return def; }
    }
    function lsSet(key, val) {
        try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(val)); return true; }
        catch (e) { return false; } // quota dépassé : on continue sans cache
    }

    function formatTime(ts) {
        var d = new Date(ts);
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/'
            + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    // Horloge du serveur (#serverTime), dans le même repère que les heures lues dans les rapports.
    // Date.now() serait décalé si le PC n'est pas sur le fuseau du serveur.
    function nowClock() {
        var t = $('#serverTime').text().trim().split(':');
        var d = $('#serverDate').text().trim().split('/');
        var ms = new Date(+d[2], +d[1] - 1, +d[0], +t[0], +t[1], +t[2]).getTime();
        return isNaN(ms) ? Date.now() : ms;
    }

    function ageHours(ts) {
        return (nowClock() - ts) / 3600000;
    }

    function ageColor(h) {
        for (var i = 0; i < AGE_COLORS.length; i++) {
            if (h <= AGE_COLORS[i].maxH) return AGE_COLORS[i];
        }
        return AGE_COLORS[AGE_COLORS.length - 1];
    }

    function getMapCenter() {
        try {
            if (typeof TWMap !== 'undefined') {
                if (TWMap.pos && TWMap.pos.length === 2) return { x: +TWMap.pos[0], y: +TWMap.pos[1] };
                if (TWMap.map && TWMap.map.getCenter) {
                    var c = TWMap.map.getCenter();
                    if (c && !isNaN(+c.x)) return { x: +c.x, y: +c.y };
                }
            }
        } catch (e) {}
        return { x: +game_data.village.x, y: +game_data.village.y };
    }

    // Position (px) d'une coordonnée dans la zone visible de #map, ou null si l'API carte
    // n'est pas disponible (on préfère ne rien dessiner que dessiner au mauvais endroit).
    function coordToPixel(wx, wy) {
        try {
            if (typeof TWMap === 'undefined' || !TWMap.map) return null;
            var m = TWMap.map;
            if (m.pixelByCoord && m.pos) {
                var p  = m.pixelByCoord(wx, wy);
                var sc = m.scale || [53, 38];
                return { x: p[0] - m.pos[0] + sc[0] / 2, y: p[1] - m.pos[1] + sc[1] / 2 };
            }
            if (m.coordToPixel) {
                var q = m.coordToPixel(wx, wy);
                return q && q.length ? { x: q[0], y: q[1] } : q;
            }
        } catch (e) {}
        return null;
    }

    function getFieldPixels() {
        if (typeof TWMap !== 'undefined' && TWMap.map) {
            var z = TWMap.map.getZoomLevel ? TWMap.map.getZoomLevel() : 1;
            var sizes = { 1:3, 2:5, 3:8, 4:10, 5:14, 6:20, 7:28, 8:40, 9:55, 10:80 };
            return sizes[z] || 20;
        }
        return 20;
    }

    function calcDist(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    }

    function msToHms(ms) {
        var s = Math.max(0, Math.floor(ms / 1000));
        return pad(Math.floor(s/3600)) + ':' + pad(Math.floor((s%3600)/60)) + ':' + pad(s%60);
    }

    // ─── Source A : rapports de conquête

    function fetchReportConquests() {
        return $.get(
            game_data.link_base_pure + 'report&mode=all&type=conquest'
        ).then(function (html) {
            var results = [];
            var doc     = new DOMParser().parseFromString(html, 'text/html');
            var $rows   = $(doc).find('#report_list tr.row_a, #report_list tr.row_b');

            $rows.each(function () {
                var $row = $(this);

                // Sujet du rapport : « Off 1 (500|500) K55 conquiert Bourg (498|497) K44 ».
                // Le village conquis est la DERNIÈRE coordonnée du sujet (la 1re est l'attaquant).
                var $subject = $row.find('.quickedit-label, a[href*="view="]').first();
                var subject  = ($subject.text() || $row.find('td').first().text()).replace(/\s+/g, ' ').trim();
                var coords   = subject.match(/\d{1,3}\|\d{1,3}/g);
                if (!coords) return;
                var xy    = coords[coords.length - 1].split('|');
                var x = +xy[0], y = +xy[1];
                var coord = x + '|' + y;

                // Heure du rapport (dernière cellule)
                var timeStr = $row.find('.report-time').text().trim() || $row.find('td').last().text().trim();
                var ts      = parseReportTime(timeStr);

                // Lien info_village éventuel
                var $vLink    = $row.find('a[href*="info_village"]').first();
                var _vidM     = ($vLink.attr('href') || '').match(/id=(\d+)/);
                var villId    = _vidM ? _vidM[1] : null;

                if (coord && ts) {
                    results.push({
                        coord:       coord,
                        x:           x,
                        y:           y,
                        villageName: coord,
                        villageId:   villId ? +villId : null,
                        subject:     subject,
                        oldPlayer:   '',
                        newPlayer:   '',
                        ts:          ts,
                        ageH:        ageHours(ts),
                        source:      'report',
                    });
                }
            });

            return results;
        }, function () {
            return [];
        });
    }

    // Parse le format de date GT depuis les rapports :
    // « aujourd'hui à HH:mm:ss », « hier à … », « jj.mm. HH:mm:ss », « jj/mm/aaaa HH:mm:ss »
    function parseReportTime(str) {
        if (!str) return null;

        var serverDate = $('#serverDate').text().trim().split('/');
        var d = +serverDate[0], mo = +serverDate[1], y = +serverDate[2];

        var todayRx  = /(?:aujourd.hui|today|heute|hoje).*?(\d{1,2}):(\d{2})(?::(\d{2}))?/i;
        var hierRx   = /(?:hier|yesterday|gestern|ontem).*?(\d{1,2}):(\d{2})(?::(\d{2}))?/i;
        var fullRx   = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})?\s*(?:à\s*)?(\d{1,2}):(\d{2})(?::(\d{2}))?/;
        var fullRx2  = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/;

        var m, date, hasYear = false;

        if ((m = todayRx.exec(str))) {
            date = new Date(y, mo - 1, d, +m[1], +m[2], +(m[3] || 0));
        } else if ((m = hierRx.exec(str))) {
            date = new Date(y, mo - 1, d - 1, +m[1], +m[2], +(m[3] || 0));
        } else if ((m = fullRx2.exec(str))) {
            hasYear = true;
            date = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
        } else if ((m = fullRx.exec(str))) {
            var yy = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : y;
            hasYear = !!m[3];
            date = new Date(yy, +m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0));
        } else {
            return null;
        }

        // Sans année : une date « future » appartient à l'année précédente (rapport de décembre lu en janvier)
        if (!hasYear && date.getTime() > new Date(y, mo - 1, d, 23, 59, 59).getTime()) {
            date.setFullYear(date.getFullYear() - 1);
        }
        return date.getTime();
    }

    // ─── Source B : village.txt 

    // On ne garde en cache que { id: player_id } (≈ 1 Mo pour 60 000 villages) et la liste
    // des changements détectés. Stocker deux copies complètes de village.txt dépassait le
    // quota du localStorage (~5 Mo) sur les gros mondes et bloquait le script.
    function fetchVillageTxt() {
        var now       = nowClock();
        var lastFetch = +lsGet('_lastVillageFetch', 0) || 0;

        // Nettoyage de l'ancien format (deux snapshots complets, parfois > 5 Mo)
        try { localStorage.removeItem(LS_PREFIX + '_snap_curr'); localStorage.removeItem(LS_PREFIX + '_snap_prev'); } catch (e) {}

        txtChanges = lsGet('_txtChanges', []) || [];
        if (now - lastFetch < FETCH_COOLDOWN) return $.Deferred().resolve().promise();

        return $.ajax({ url: '/map/village.txt', dataType: 'text' }).then(function (raw) {
            var prevPids = lsGet('_pids', null);
            var newPids  = {};
            var found    = [];
            // Le changement a eu lieu entre le fetch précédent et maintenant : on prend le milieu
            var approxTs = lastFetch ? Math.round((lastFetch + now) / 2) : now;

            (raw.match(/[^\r\n]+/g) || []).forEach(function (line) {
                var p = line.split(',');
                if (p.length < 6) return;
                var id = +p[0], pid = +p[4];
                newPids[id] = pid;
                if (prevPids && prevPids[id] !== undefined && prevPids[id] !== pid) {
                    var name;
                    try { name = decodeURIComponent(p[1].replace(/\+/g, ' ')); }
                    catch (e) { name = p[1].replace(/\+/g, ' '); }   // nom mal encodé : on garde le brut
                    found.push({ id: id, name: name, x: +p[2], y: +p[3], oldPid: prevPids[id], newPid: pid, ts: approxTs });
                }
            });

            // Fusionne avec l'historique, garde 7 jours et 500 entrées max
            var cutoff = now - 7 * 86400000;
            txtChanges = found.concat(txtChanges).filter(function (c) { return c.ts >= cutoff; }).slice(0, 500);

            lsSet('_pids', newPids);
            lsSet('_txtChanges', txtChanges);
            lsSet('_lastVillageFetch', now);
        }, function () {
            // échec village.txt : on garde l'historique déjà en cache
            return $.Deferred().resolve().promise();
        });
    }

    function extractVillageTxtConquests(center) {
        var results = [];
        txtChanges.forEach(function (c) {
            if (calcDist(c.x, c.y, center.x, center.y) > radiusField) return;
            var coord = c.x + '|' + c.y;
            var alreadyInReports = conquests.some(function (r) { return r.coord === coord && r.source === 'report'; })
                || results.some(function (r) { return r.coord === coord; });
            if (alreadyInReports) return;
            results.push({
                coord:       coord,
                x:           c.x,
                y:           c.y,
                villageName: c.name,
                villageId:   c.id,
                oldPlayer:   c.oldPid === 0 ? 'Barbare' : 'Joueur #' + c.oldPid,
                newPlayer:   c.newPid === 0 ? 'Barbare' : 'Joueur #' + c.newPid,
                ts:          c.ts,
                ageH:        ageHours(c.ts),
                source:      'village.txt',
                approximate: true,
            });
        });
        return results;
    }

    // ─── Overlay SVG ─────────────────────────────────────────────────────────

    function buildOverlay() {
        if ($('#ct-overlay').length) return;

        overlay = document.createElementNS(svgNS, 'svg');
        overlay.id = 'ct-overlay';
        overlay.setAttribute('style',
            'position:absolute;top:0;left:0;width:100%;height:100%;'
            + 'pointer-events:none;z-index:9997;overflow:visible;');

        // Définitions pour l'animation de pulse
        var defs = document.createElementNS(svgNS, 'defs');
        defs.innerHTML = '<style>'
            + '@keyframes ct-pulse {'
            + '0%{r:6;opacity:0.9}'
            + '50%{r:12;opacity:0.3}'
            + '100%{r:6;opacity:0.9}'
            + '}'
            + '.ct-ring{animation:ct-pulse 1.8s ease-in-out infinite;}'
            + '</style>';
        overlay.appendChild(defs);

        var $map    = $('#map');
        var $parent = $map.parent();
        if (!$map.length) return;
        if ($parent.css('position') === 'static') $parent.css('position', 'relative');
        // L'overlay couvre exactement #map (et pas tout le parent) ; ce qui dépasse est masqué
        var pos = $map.position();
        overlay.setAttribute('style',
            'position:absolute;top:' + pos.top + 'px;left:' + pos.left + 'px;'
            + 'width:' + $map.outerWidth() + 'px;height:' + $map.outerHeight() + 'px;'
            + 'pointer-events:none;z-index:9997;overflow:hidden;');
        $parent.append(overlay);
    }

    function redrawOverlay() {
        if (!overlay) return;
        // Supprime tous les éléments sauf <defs>
        var children = Array.prototype.slice.call(overlay.childNodes);
        children.forEach(function (c) {
            if (c.nodeName !== 'defs') overlay.removeChild(c);
        });

        var now    = nowClock();
        var center = getMapCenter();

        conquests.forEach(function (c) {
            if (c.ageH > filterAge) return;
            if (calcDist(c.x, c.y, center.x, center.y) > radiusField) return;

            var pos    = coordToPixel(c.x, c.y);
            if (!pos) return;

            var color  = ageColor(c.ageH);
            var g      = document.createElementNS(svgNS, 'g');
            g.setAttribute('style', 'pointer-events:all;cursor:pointer;');

            // Anneau pulsant pour les < 1h
            if (c.ageH < 1) {
                var ring = document.createElementNS(svgNS, 'circle');
                ring.setAttribute('cx',    pos.x);
                ring.setAttribute('cy',    pos.y);
                ring.setAttribute('r',     '6');
                ring.setAttribute('fill',  color.fill);
                ring.setAttribute('opacity', '0.4');
                ring.setAttribute('class', 'ct-ring');
                g.appendChild(ring);
            }

            // Point principal
            var dot = document.createElementNS(svgNS, 'circle');
            dot.setAttribute('cx',           pos.x);
            dot.setAttribute('cy',           pos.y);
            dot.setAttribute('r',            c.source === 'report' ? '6' : '4');
            dot.setAttribute('fill',         color.fill);
            dot.setAttribute('stroke',       color.stroke);
            dot.setAttribute('stroke-width', '1.5');
            g.appendChild(dot);

            // Couronne SVG (noble)
            var crown = document.createElementNS(svgNS, 'text');
            crown.setAttribute('x',           pos.x);
            crown.setAttribute('y',           pos.y - 9);
            crown.setAttribute('text-anchor', 'middle');
            crown.setAttribute('font-size',   c.ageH < 3 ? '12' : '9');
            crown.setAttribute('style',       'pointer-events:none;');
            crown.textContent = '♛';
            g.appendChild(crown);

            // Tooltip natif GT (title)
            var titleEl = document.createElementNS(svgNS, 'title');
            var approxStr = c.approximate ? ' (horodatage approx.)' : '';
            titleEl.textContent = '♛ ' + c.villageName + ' (' + c.coord + ')\n'
                + (c.subject ? c.subject + '\n' : 'Ancien : ' + c.oldPlayer + '\n' + 'Nouveau : ' + c.newPlayer + '\n')
                + 'Date : ' + formatTime(c.ts) + approxStr + '\n'
                + 'Il y a : ' + c.ageH.toFixed(1) + 'h'
                + (c.source === 'village.txt' ? '\nSource : village.txt' : '');
            g.appendChild(titleEl);

            // Clic → ouvre info_village
            if (c.villageId) {
                g.setAttribute('onclick',
                    'window.open("' + game_data.link_base_pure + 'info_village&id=' + c.villageId + '","_blank")');
            }

            overlay.appendChild(g);
        });
    }

    // ─── Panneau latéral ──────────────────────────────────────────────────────

    function buildPanel() {
        if ($('#ct-panel').length) return;

        var html = '<div id="ct-panel" style="'
            + 'position:fixed;top:80px;right:12px;width:270px;'
            + 'background:#f4e8c1;border:2px solid #a0820a;border-radius:5px;'
            + 'box-shadow:0 3px 16px rgba(0,0,0,0.5);z-index:99998;'
            + 'font-family:Verdana,sans-serif;font-size:11px;">'

            // Header
            + '<div id="ct-header" style="background:#7c6200;color:#fff;padding:7px 10px;'
                + 'border-radius:3px 3px 0 0;display:flex;align-items:center;'
                + 'justify-content:space-between;cursor:move;">'
                + '<strong>&#9819; Conquest Tracker</strong>'
                + '<span id="ct-close" style="cursor:pointer;font-size:15px;">&#x2715;</span>'
            + '</div>'

            // Contrôles
            + '<div style="padding:8px 10px;background:#e8d49a;border-bottom:1px solid #c9a800;">'

                + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">'
                    + '<label style="color:#5a3e00;white-space:nowrap;">Rayon (champs) :</label>'
                    + '<input type="range" id="ct-radius" min="10" max="300" value="'+radiusField+'" '
                        + 'style="flex:1;" oninput="ConquestTracker._prv.setRadius(this.value)">'
                    + '<span id="ct-radius-lbl" style="min-width:28px;font-weight:bold;color:#3d2b00;">'+radiusField+'</span>'
                + '</div>'

                + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">'
                    + '<label style="color:#5a3e00;white-space:nowrap;">Ancienneté max :</label>'
                    + '<select id="ct-age-filter" style="flex:1;padding:2px 4px;border:1px solid #a0820a;'
                        + 'border-radius:3px;background:#fffbe8;font-size:10px;">'
                        + '<option value="1">< 1h</option>'
                        + '<option value="3">< 3h</option>'
                        + '<option value="6">< 6h</option>'
                        + '<option value="24">< 24h</option>'
                        + '<option value="999" selected>Tout</option>'
                    + '</select>'
                + '</div>'

                + '<div style="display:flex;gap:5px;flex-wrap:wrap;">'
                    + '<button id="ct-refresh" style="'+btnStyle('#8a6f1e')+';flex:1;">&#x21BB; Actualiser</button>'
                    + '<button id="ct-clear" style="'+btnStyle('#922b21')+';flex:1;">Effacer</button>'
                + '</div>'

            + '</div>'

            // Légende
            + '<div style="padding:5px 10px;border-bottom:1px solid #c9a800;display:flex;gap:6px;flex-wrap:wrap;">'
                + AGE_COLORS.map(function(c) {
                    return '<span style="font-size:9px;display:flex;align-items:center;gap:2px;">'
                        + '<span style="width:8px;height:8px;border-radius:50%;background:'+c.fill+';display:inline-block;"></span>'
                        + c.label+'</span>';
                }).join('')
                + '<span style="font-size:9px;color:#7c6200;">&#x25CF; rapport &nbsp; &#x25CF; village.txt</span>'
            + '</div>'

            // Liste des conquêtes
            + '<div id="ct-list" style="max-height:360px;overflow-y:auto;padding:4px 8px;">'
                + '<div style="color:#7c6200;font-size:10px;padding:6px 0;">Cliquez "Actualiser" pour charger.</div>'
            + '</div>'

            // Stats
            + '<div style="border-top:1px solid #c9a800;display:flex;">'
                + '<div style="flex:1;text-align:center;padding:5px;border-right:1px solid #c9a800;">'
                    + '<div style="color:#7c6200;font-size:9px;">Total</div>'
                    + '<div id="ct-st-total" style="font-weight:bold;color:#3d2b00;font-size:13px;">0</div>'
                + '</div>'
                + '<div style="flex:1;text-align:center;padding:5px;border-right:1px solid #c9a800;">'
                    + '<div style="color:#7c6200;font-size:9px;">Zone</div>'
                    + '<div id="ct-st-zone" style="font-weight:bold;color:#3d2b00;font-size:13px;">0</div>'
                + '</div>'
                + '<div style="flex:1;text-align:center;padding:5px;">'
                    + '<div style="color:#7c6200;font-size:9px;">< 6h</div>'
                    + '<div id="ct-st-recent" style="font-weight:bold;color:#e74c3c;font-size:13px;">0</div>'
                + '</div>'
            + '</div>'

        + '</div>';

        $('body').append(html);
        panel = $('#ct-panel')[0];

        makeDraggable(panel, document.getElementById('ct-header'));
        bindPanelEvents();
    }

    function btnStyle(color) {
        return 'padding:3px 6px;border:1px solid '+color+';border-radius:3px;'
            + 'background:transparent;color:'+color+';cursor:pointer;font-size:10px;'
            + 'font-family:Verdana,sans-serif;';
    }

    function makeDraggable(el, handle) {
        var sx, sy, sl, st;
        $(handle).on('mousedown', function (e) {
            e.preventDefault();
            sx = e.clientX; sy = e.clientY;
            sl = parseInt($(el).css('left')) || (window.innerWidth - $(el).outerWidth() - 12);
            st = parseInt($(el).css('top'));
            $(el).css({ left: sl, right: 'auto' });
            $(document).on('mousemove.ctdrag', function (e) {
                $(el).css({ left: sl + e.clientX - sx, top: st + e.clientY - sy });
            }).on('mouseup.ctdrag', function () {
                $(document).off('mousemove.ctdrag mouseup.ctdrag');
            });
        });
    }

    function renderList() {
        var center  = getMapCenter();
        var visible = conquests.filter(function (c) {
            return c.ageH <= filterAge
                && calcDist(c.x, c.y, center.x, center.y) <= radiusField;
        });

        // Trie par ancienneté croissante (plus récent en premier)
        visible.sort(function (a, b) { return a.ageH - b.ageH; });

        $('#ct-st-total').text(conquests.length);
        $('#ct-st-zone').text(visible.length);
        $('#ct-st-recent').text(conquests.filter(function(c){ return c.ageH < 6; }).length);

        if (visible.length === 0) {
            $('#ct-list').html('<div style="color:#7c6200;font-size:10px;padding:6px 0;">Aucune conquête dans ce rayon.</div>');
            return;
        }

        var html = '';
        visible.forEach(function (c) {
            var color   = ageColor(c.ageH);
            var vUrl    = c.villageId ? game_data.link_base_pure + 'info_village&id=' + c.villageId : '#';
            var mapUrl  = game_data.link_base_pure + 'map&x=' + c.x + '&y=' + c.y;
            var srcBadge = c.source === 'report'
                ? '<span style="font-size:8px;background:#2980b9;color:#fff;padding:1px 3px;border-radius:2px;">rapport</span>'
                : '<span style="font-size:8px;background:#7f8c8d;color:#fff;padding:1px 3px;border-radius:2px;">~txt</span>';

            html += '<div style="display:flex;align-items:flex-start;gap:5px;padding:5px 2px;'
                + 'border-bottom:1px solid rgba(160,130,10,0.15);">'
                + '<span style="width:10px;height:10px;border-radius:50%;background:'+color.fill+';'
                    + 'flex-shrink:0;margin-top:2px;"></span>'
                + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-weight:bold;font-size:10px;color:#3d2b00;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'
                        + '<a href="'+vUrl+'" target="_blank" style="color:#3d2b00;text-decoration:none;">&#9819; '+escapeHtml(c.villageName)+'</a>'
                        + ' <span style="font-size:9px;color:#7c6200;">('+c.coord+')</span>'
                    + '</div>'
                    + '<div style="font-size:9px;color:#5a3e00;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'
                        + (c.subject
                            ? escapeHtml(c.subject)
                            : '<span style="color:#c0392b;">'+escapeHtml(c.oldPlayer)+'</span>'
                              + ' → <span style="color:#27ae60;">'+escapeHtml(c.newPlayer)+'</span>')
                    + '</div>'
                    + '<div style="font-size:9px;color:#7c6200;margin-top:1px;">'
                        + (c.approximate ? '~' : '') + formatTime(c.ts)
                        + ' &nbsp;' + srcBadge
                    + '</div>'
                + '</div>'
                + '<a href="'+mapUrl+'" target="_blank" style="font-size:11px;color:#8a6f1e;text-decoration:none;flex-shrink:0;" title="Voir sur la carte">&#x1F5FA;</a>'
            + '</div>';
        });

        $('#ct-list').html(html);
    }

    // ─── Chargement des données ───────────────────────────────────────────────

    function loadAll() {
        $('#ct-refresh').text('...').prop('disabled', true);

        var center = getMapCenter();

        $.when(
            fetchReportConquests(),
            fetchVillageTxt()
        ).then(function (reportResults) {
            var reports = reportResults || [];

            // Complète avec village.txt pour la zone visible
            var txtResults = extractVillageTxtConquests(center);

            // Fusionne en évitant les doublons (priorité aux rapports)
            conquests = reports.concat(txtResults);

            // Trie par ancienneté
            conquests.sort(function (a, b) { return a.ageH - b.ageH; });

            redrawOverlay();
            renderList();
            UI.SuccessMessage('Conquest Tracker — ' + conquests.length + ' conquête(s) chargée(s).', 3000);
        }, function () {
            UI.ErrorMessage('Conquest Tracker — erreur de chargement des données.', 4000);
        }).always(function () {
            $('#ct-refresh').html('&#x21BB; Actualiser').prop('disabled', false);
        });
    }

    // ─── Events panneau ──────────────────────────────────────────────────────

    function bindPanelEvents() {
        $('#ct-close').off('click').on('click', function () {
            $('#ct-panel, #ct-overlay').remove();
            $(document).off('mousemove.ctmap');
            $('#map, #map_container').off('wheel.ct');
            clearInterval(window._ctRedrawInterval);
            if (typeof TWMap !== 'undefined' && TWMap.map) TWMap.map._ctHooked = false;
        });

        $('#ct-refresh').off('click').on('click', function () {
            loadAll();
        });

        $('#ct-clear').off('click').on('click', function () {
            conquests = [];
            redrawOverlay();
            renderList();
        });

        $('#ct-age-filter').off('change').on('change', function () {
            filterAge = +$(this).val();
            redrawOverlay();
            renderList();
        });
    }

    var prv = {
        setRadius: function (v) {
            radiusField = +v;
            $('#ct-radius-lbl').text(v);
            redrawOverlay();
            renderList();
        },
    };

    ConquestTracker._prv = prv;

    // ─── Accrochage à la carte GT ─────────────────────────────────────────────

    function hookMap() {
        if (typeof TWMap !== 'undefined' && TWMap.map && !TWMap.map._ctHooked) {
            var orig = TWMap.map.redraw || function () {};
            TWMap.map.redraw = function () {
                orig.apply(this, arguments);
                redrawOverlay();
                renderList();
            };
            TWMap.map._ctHooked = true;
        }

        // Réinitialise les event listeners pour éviter l'empilement
        $(document).off('mousemove.ctmap').on('mousemove.ctmap', '#map', function () {
            if (!prv._rt) {
                prv._rt = setTimeout(function () {
                    redrawOverlay();
                    prv._rt = null;
                }, 50);
            }
        });

        $('#map, #map_container').off('wheel.ct').on('wheel.ct', function () {
            setTimeout(function () { redrawOverlay(); renderList(); }, 200);
        });

        // Redraw périodique pour mettre à jour les couleurs d'ancienneté
        clearInterval(window._ctRedrawInterval);
        window._ctRedrawInterval = setInterval(function () {
            conquests.forEach(function (c) { c.ageH = ageHours(c.ts); });
            redrawOverlay();
            renderList();
        }, 60000); // toutes les minutes
    }

    // ─── Point d'entrée ───────────────────────────────────────────────────────

    ConquestTracker.init = function () {
        if (game_data.screen !== 'map') {
            UI.ErrorMessage('Conquest Tracker doit être exécuté depuis la carte.', 5000);
            return;
        }

        // Toggle : 2ème clic = fermeture propre
        if ($('#ct-panel').length) {
            $('#ct-panel, #ct-overlay').remove();
            $(document).off('mousemove.ctmap');
            $('#map, #map_container').off('wheel.ct');
            clearInterval(window._ctRedrawInterval);
            if (typeof TWMap !== 'undefined' && TWMap.map) TWMap.map._ctHooked = false;
            return;
        }

        buildPanel();
        buildOverlay();
        hookMap();
        loadAll();
    };

})(jQuery);

ConquestTracker.init();
