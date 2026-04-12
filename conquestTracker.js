// Conquest Tracker — v1.0
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
    var prevSnap    = {};
    var currSnap    = {};

    // ─── Utilitaires ─────────────────────────────────────────────────────────

    function pad(n) { return ('0' + n).slice(-2); }

    function formatTime(ts) {
        var d = new Date(ts);
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/'
            + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    function ageHours(ts) {
        return (Date.now() - ts) / 3600000;
    }

    function ageColor(h) {
        for (var i = 0; i < AGE_COLORS.length; i++) {
            if (h <= AGE_COLORS[i].maxH) return AGE_COLORS[i];
        }
        return AGE_COLORS[AGE_COLORS.length - 1];
    }

    function getMapCenter() {
        if (typeof TWMap !== 'undefined' && TWMap.map) {
            var c = TWMap.map.getCenter ? TWMap.map.getCenter()
                  : { x: game_data.village.x, y: game_data.village.y };
            return c;
        }
        return { x: +game_data.village.x, y: +game_data.village.y };
    }

    function coordToPixel(wx, wy) {
        if (typeof TWMap !== 'undefined' && TWMap.map && TWMap.map.coordToPixel) {
            return TWMap.map.coordToPixel(wx, wy);
        }
        return { x: wx * 10, y: wy * 10 };
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
            var $rows   = $($.parseHTML(html)).find('#report_list tr.row_a, #report_list tr.row_b');

            $rows.each(function () {
                var $row = $(this);

                // Coordonnées dans le titre du rapport
                var coordMatch = $row.find('td').text().match(/(\d{1,3})\|(\d{1,3})/);
                if (!coordMatch) return;

                var x = +coordMatch[1], y = +coordMatch[2];
                var coord = x + '|' + y;

                // Heure du rapport
                var timeStr = $row.find('.report-time, td:last').text().trim();
                var ts      = parseReportTime(timeStr);

                // Nom du village (lien info_village)
                var $vLink    = $row.find('a[href*="info_village"]').first();
                var villName  = $vLink.text().trim() || coord;
                var villId    = ($vLink.attr('href') || '').match(/id=(\d+)/)?.[1];

                // Attaquant et défenseur depuis les colonnes du rapport
                var $tds     = $row.find('td');
                var attacker = $tds.eq(1).text().trim();
                var defender = $tds.eq(2).text().trim();

                if (coord && ts) {
                    results.push({
                        coord:       coord,
                        x:           x,
                        y:           y,
                        villageName: villName,
                        villageId:   villId ? +villId : null,
                        oldPlayer:   defender,
                        newPlayer:   attacker,
                        ts:          ts,
                        ageH:        ageHours(ts),
                        source:      'report',
                    });
                }
            });

            return results;
        }).fail(function () {
            return [];
        });
    }

    // Parse le format de date GT depuis les rapports
    function parseReportTime(str) {
        // Format : "aujourd'hui à HH:mm:ss" / "hier à HH:mm:ss" / "jj/mm/aaaa HH:mm:ss"
        if (!str) return null;

        var serverDate = $('#serverDate').text().trim().split('/');
        var d = +serverDate[0], mo = +serverDate[1], y = +serverDate[2];

        var todayRx    = /aujourd.hui.+(\d{2}:\d{2}:\d{2})/i;
        var hierRx     = /hier.+(\d{2}:\d{2}:\d{2})/i;
        var fullRx     = /(\d{1,2})\.(\d{1,2})\.\s*(\d{2}:\d{2}:\d{2})/;
        var fullRx2    = /(\d{1,2})\/(\d{1,2})\/\d{4}\s+(\d{2}:\d{2}:\d{2})/;

        var match, parts, date;

        if ((match = todayRx.exec(str))) {
            parts = match[1].split(':');
            date  = new Date(y, mo - 1, d, +parts[0], +parts[1], +parts[2]);
        } else if ((match = hierRx.exec(str))) {
            parts = match[1].split(':');
            date  = new Date(y, mo - 1, d - 1, +parts[0], +parts[1], +parts[2]);
        } else if ((match = fullRx.exec(str))) {
            parts = match[3].split(':');
            date  = new Date(y, +match[2] - 1, +match[1], +parts[0], +parts[1], +parts[2]);
        } else if ((match = fullRx2.exec(str))) {
            parts = match[3].split(':');
            date  = new Date(y, +match[2] - 1, +match[1], +parts[0], +parts[1], +parts[2]);
        } else {
            return null;
        }

        return date.getTime();
    }

    // ─── Source B : village.txt 

    function fetchVillageTxt() {
        var now       = Date.now();
        var lastFetch = +localStorage.getItem(LS_PREFIX + '_lastVillageFetch') || 0;
        var remaining = FETCH_COOLDOWN - (now - lastFetch);

        // Cache encore valide
        if (remaining > 0) {
            var stored = localStorage.getItem(LS_PREFIX + '_snap_curr');
            currSnap   = stored ? JSON.parse(stored) : {};
            var prev   = localStorage.getItem(LS_PREFIX + '_snap_prev');
            prevSnap   = prev ? JSON.parse(prev) : {};
            return $.Deferred().resolve().promise();
        }

        return $.get('/map/village.txt').then(function (raw) {
            var newSnap = {};
            (raw.match(/[^\r\n]+/g) || []).forEach(function (line) {
                var p = line.split(',');
                if (p.length < 6) return;
                newSnap[+p[0]] = {
                    name:      decodeURIComponent(p[1].replace(/\+/g, ' ')),
                    x:         +p[2],
                    y:         +p[3],
                    player_id: +p[4],
                    points:    +p[5],
                };
            });

            prevSnap = currSnap = {};
            var oldStored = localStorage.getItem(LS_PREFIX + '_snap_curr');
            if (oldStored) prevSnap = JSON.parse(oldStored);

            currSnap = newSnap;
            localStorage.setItem(LS_PREFIX + '_snap_curr', JSON.stringify(currSnap));
            localStorage.setItem(LS_PREFIX + '_snap_prev', JSON.stringify(prevSnap));
            localStorage.setItem(LS_PREFIX + '_lastVillageFetch', now);
        }).fail(function () { return []; });
    }

    function extractVillageTxtConquests(center) {
        var results = [];
        var lastFetch = +localStorage.getItem(LS_PREFIX + '_lastVillageFetch') || Date.now();

        Object.keys(currSnap).forEach(function (id) {
            var curr = currSnap[id];
            var prev = prevSnap[id];
            if (!prev || curr.player_id === prev.player_id) return;

            // Filtre par rayon
            if (calcDist(curr.x, curr.y, center.x, center.y) > radiusField) return;

            var coord = curr.x + '|' + curr.y;

            // Vérifie qu'on n'a pas déjà ce village depuis les rapports
            var alreadyInReports = conquests.some(function (c) {
                return c.coord === coord && c.source === 'report';
            });
            if (alreadyInReports) return;

            results.push({
                coord:       coord,
                x:           curr.x,
                y:           curr.y,
                villageName: curr.name,
                villageId:   +id,
                oldPlayer:   'Joueur #' + prev.player_id,
                newPlayer:   curr.player_id === 0 ? 'Barbare' : 'Joueur #' + curr.player_id,
                // Timestamp approximatif = milieu de la fenêtre de fetch
                ts:          lastFetch - (FETCH_COOLDOWN / 2),
                ageH:        ageHours(lastFetch - FETCH_COOLDOWN / 2),
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

        var $parent = $('#map').parent();
        if ($parent.css('position') === 'static') $parent.css('position', 'relative');
        $parent.append(overlay);
    }

    function redrawOverlay() {
        if (!overlay) return;
        while (overlay.firstChild && overlay.firstChild.nodeName === 'g') {
            overlay.removeChild(overlay.firstChild);
        }
        // Garde les <defs>
        var children = Array.from(overlay.childNodes);
        children.forEach(function (c) {
            if (c.nodeName !== 'defs') overlay.removeChild(c);
        });

        var now    = Date.now();
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
                + 'Ancien : ' + c.oldPlayer + '\n'
                + 'Nouveau : ' + c.newPlayer + '\n'
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
        if ($('#ct-panel').length) { $('#ct-panel').remove(); return; }

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
                        + '<a href="'+vUrl+'" target="_blank" style="color:#3d2b00;text-decoration:none;">&#9819; '+c.villageName+'</a>'
                        + ' <span style="font-size:9px;color:#7c6200;">('+c.coord+')</span>'
                    + '</div>'
                    + '<div style="font-size:9px;color:#5a3e00;margin-top:1px;">'
                        + '<span style="color:#c0392b;">'+c.oldPlayer+'</span>'
                        + ' → <span style="color:#27ae60;">'+c.newPlayer+'</span>'
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

            $('#ct-refresh').text('&#x21BB; Actualiser').prop('disabled', false);
            UI.SuccessMessage('Conquest Tracker — ' + conquests.length + ' conquête(s) chargée(s).', 3000);
        });
    }

    // ─── Events panneau ──────────────────────────────────────────────────────

    function bindPanelEvents() {
        $('#ct-close').off('click').on('click', function () {
            $('#ct-panel').remove();
            $('#ct-overlay').remove();
            $(document).off('mousemove.ctmap wheel.ct');
            clearInterval(window._ctRedrawInterval);
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
        if (typeof TWMap !== 'undefined' && TWMap.map) {
            var orig = TWMap.map.redraw || function () {};
            TWMap.map.redraw = function () {
                orig.apply(this, arguments);
                redrawOverlay();
                renderList();
            };
        }

        // Throttle mousemove pour le suivi de déplacement
        $(document).on('mousemove.ctmap', '#map', function () {
            if (!prv._rt) {
                prv._rt = setTimeout(function () {
                    redrawOverlay();
                    prv._rt = null;
                }, 50);
            }
        });

        $('#map, #map_container').on('wheel.ct', function () {
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

        buildPanel();
        buildOverlay();
        hookMap();
        loadAll();
    };

})(jQuery);

ConquestTracker.init();
