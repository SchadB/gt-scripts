/*
 * Script Name: All Incomings
 * Version: v1.1
 * Author: Schadrac
 * Screen: n'importe (fonctionne partout)
 * Description: Tableau de bord de toutes les attaques entrantes sur tous tes villages,
 *              avec décompte en temps réel, couleur par urgence, et carte.
 */

var AllIncomings = AllIncomings || {};

(function ($) {

    var LS_PREFIX  = 'schadrac_allIncomings';
    var panel      = null;

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function getServerTime() {
        var t = $('#serverTime').text().trim().split(':');
        var d = $('#serverDate').text().trim().split('/');
        return new Date(+d[2], +d[1]-1, +d[0], +t[0], +t[1], +t[2]);
    }

    function pad(n) { return ('0'+n).slice(-2); }

    function formatDateTime(date) {
        return pad(date.getDate())+'/'+pad(date.getMonth()+1)+'/'+date.getFullYear()
            +' '+pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds());
    }

    function secondsToHms(sec) {
        sec = Math.max(0, Math.floor(sec));
        return pad(Math.floor(sec/3600))+':'+pad(Math.floor((sec%3600)/60))+':'+pad(sec%60);
    }

    function urgencyColor(sec) {
        if (sec < 3600)  return { bg: '#f9e0e0', dot: '#e74c3c' }; // < 1h rouge
        if (sec < 10800) return { bg: '#fef3e0', dot: '#e67e22' }; // < 3h orange
        if (sec < 21600) return { bg: '#fefde0', dot: '#f1c40f' }; // < 6h jaune
        return { bg: '#f0f8f0', dot: '#27ae60' };                   // > 6h vert
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
            return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
    }

    // Les timestamps du jeu (data-endtime) sont absolus (UTC), alors que getServerTime()
    // représente l'horloge du serveur dans le fuseau du PC. On convertit donc un timestamp
    // absolu dans ce même repère, sinon tout est décalé si le PC n'est pas à l'heure de Paris.
    function serverEpochNow() {
        try {
            if (typeof Timing !== 'undefined' && Timing.getCurrentServerTime) return +Timing.getCurrentServerTime();
        } catch (e) {}
        return Date.now();
    }
    function epochToServerClock(epochMs) {
        return getServerTime().getTime() + (epochMs - serverEpochNow());
    }

    // « aujourd'hui à 13:00:00:000 », « demain à … », « le 18.11. à … », « 18.11.2026 … », « 18/11/2026 … »
    function parseArrivalText(text) {
        text = String(text || '').replace(/\s+/g, ' ').trim();
        var tm = text.match(/(\d{1,2}):(\d{2}):(\d{2})(?::(\d{1,3}))?/);
        if (!tm) return null;
        var now = getServerTime();
        var y = now.getFullYear(), mo = now.getMonth(), d = now.getDate();
        var explicitYear = false;
        var dm = text.match(/(\d{1,2})[.\/](\d{1,2})[.\/]?(?:(\d{2,4}))?(?=\D)/);
        if (/demain|tomorrow|morgen|amanh/i.test(text)) {
            d += 1;
        } else if (/aujourd|today|heute|hoje/i.test(text)) {
            // jour courant
        } else if (dm && dm.index < tm.index) {
            d = +dm[1]; mo = +dm[2] - 1;
            if (dm[3]) { y = +dm[3] < 100 ? 2000 + +dm[3] : +dm[3]; explicitYear = true; }
        } else {
            return null;
        }
        var ms = new Date(y, mo, d, +tm[1], +tm[2], +tm[3], +(tm[4] || 0)).getTime();
        // Pas d'année explicite et date « passée » de plus d'un jour → année suivante (31/12 → 01/01)
        if (!explicitYear && ms < now.getTime() - 86400000) ms = new Date(y + 1, mo, d, +tm[1], +tm[2], +tm[3]).getTime();
        return ms;
    }

    function coordOf(text) {
        var m = String(text || '').match(/(\d{1,3})\|(\d{1,3})/g);
        return m ? m[m.length - 1] : '';
    }

    // ─── Récupération des incomings ───────────────────────────────────────────
    // Page overview_villages&mode=incomings (Premium) : colonnes
    // Commande | Destination (MON village, lien screen=overview) | Origine (lien info_village) | Joueur | Distance | Arrivée | Arrivée dans

    function fetchIncomings() {
        return $.get(
            game_data.link_base_pure + 'overview_villages&mode=incomings&page=-1'
        ).then(function(html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var results = [];

            $(doc).find('#incomings_table tr.nowrap, #incomings_table tr[id]').each(function() {
                var $row = $(this);
                var $tds = $row.find('td');
                if ($tds.length < 3) return;

                // Village défenseur = le mien (lien vers screen=overview), sinon 2e colonne
                var $def = $row.find('a').filter(function() {
                    return /[?&]screen=overview(&|$)/.test($(this).attr('href') || '');
                }).first();
                if (!$def.length) $def = $tds.eq(1).find('a').first();
                var defText  = $def.text().trim() || $tds.eq(1).text().trim();
                var defCoord = coordOf(defText);
                var defIdM   = ($def.attr('href') || '').match(/[?&](?:village|id)=(\d+)/);
                var defId    = defIdM ? +defIdM[1] : null;
                var defName  = defText.replace(/\s*\(\d{1,3}\|\d{1,3}\)\s*(K\d+)?\s*$/, '').trim() || defCoord;

                // Village attaquant = lien info_village (colonne Origine)
                var $att = $row.find('a[href*="screen=info_village"]').filter(function() {
                    return coordOf($(this).text()) && coordOf($(this).text()) !== defCoord;
                }).first();
                var attCoord = coordOf($att.text());

                // Heure d'arrivée : timestamp absolu si présent, sinon le texte « Arrivée »
                var arrivalMs = null;
                var $timer = $row.find('[data-endtime]').first();
                var endtime = +$timer.attr('data-endtime');
                if (endtime > 0) {
                    arrivalMs = epochToServerClock(endtime * 1000);
                } else {
                    $tds.each(function() {
                        var ms = parseArrivalText($(this).text());
                        if (ms) { arrivalMs = ms; return false; }
                    });
                }

                if (defCoord || arrivalMs) {
                    results.push({
                        defName:   defName,
                        defCoord:  defCoord,
                        defId:     defId,
                        attCoord:  attCoord,
                        arrivalMs: arrivalMs,
                    });
                }
            });

            // Trie par heure d'arrivée (inconnues en dernier)
            results.sort(function(a, b) { return (a.arrivalMs || Infinity) - (b.arrivalMs || Infinity); });
            return results;
        }, function() { return []; });
    }

    // ─── Interface ────────────────────────────────────────────────────────────

    function buildPanel() {
        if ($('#ai-panel').length) { clearInterval(window._aiTick); $('#ai-panel').remove(); return false; }

        var html = '<div id="ai-panel" style="'
            + 'position:fixed;top:70px;left:12px;width:580px;max-height:520px;'
            + 'background:#f4e8c1;border:2px solid #a0820a;border-radius:5px;'
            + 'box-shadow:0 4px 20px rgba(0,0,0,0.6);z-index:99999;'
            + 'font-family:Verdana,sans-serif;font-size:11px;display:flex;flex-direction:column;">'

            // Header
            + '<div id="ai-header" style="background:#7c3000;color:#fff;padding:8px 12px;'
                + 'border-radius:3px 3px 0 0;display:flex;align-items:center;'
                + 'justify-content:space-between;cursor:move;flex-shrink:0;">'
                + '<strong>⚔ All Incomings</strong>'
                + '<div style="display:flex;gap:10px;align-items:center;">'
                    + '<span id="ai-badge" style="background:#e74c3c;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;">0</span>'
                    + '<button id="ai-refresh" style="background:transparent;border:1px solid #fff;color:#fff;padding:2px 8px;border-radius:3px;cursor:pointer;font-size:11px;">&#x21BB;</button>'
                    + '<span id="ai-close" style="cursor:pointer;font-size:16px;">&#x2715;</span>'
                + '</div>'
            + '</div>'

            // Filtres
            + '<div style="background:#e8d49a;padding:6px 10px;border-bottom:1px solid #c9a800;flex-shrink:0;display:flex;align-items:center;gap:10px;">'
                + '<label style="color:#5a3e00;font-size:10px;">Urgence max :</label>'
                + '<select id="ai-filter" style="font-size:10px;border:1px solid #a0820a;background:#fffbe8;padding:2px;">'
                    + '<option value="3600">< 1h</option>'
                    + '<option value="10800">< 3h</option>'
                    + '<option value="21600">< 6h</option>'
                    + '<option value="86400">< 24h</option>'
                    + '<option value="999999" selected>Tout</option>'
                + '</select>'
                + '<span id="ai-last-update" style="font-size:9px;color:#7c6200;margin-left:auto;"></span>'
            + '</div>'

            // Liste
            + '<div id="ai-list" style="flex:1;overflow-y:auto;padding:4px 8px;">'
                + '<div style="text-align:center;padding:20px;color:#7c6200;">Chargement...</div>'
            + '</div>'

            + '</div>';

        $('body').append(html);
        panel = document.getElementById('ai-panel');
        makeDraggable(panel, document.getElementById('ai-header'));

        $('#ai-close').on('click', function() {
            clearInterval(window._aiTick);
            $('#ai-panel').remove();
        });
        $('#ai-refresh').on('click', loadAll);
        $('#ai-filter').on('change', function() {
            renderList(window._aiData || [], +$(this).val());
        });
    }

    function makeDraggable(el, handle) {
        var sx, sy, sl, st;
        $(handle).on('mousedown', function(e) {
            e.preventDefault();
            sx = e.clientX; sy = e.clientY;
            sl = parseInt($(el).css('left')) || 12;
            st = parseInt($(el).css('top'))  || 70;
            $(el).css({ left: sl, right: 'auto' });
            $(document).on('mousemove.aidrag', function(e) {
                $(el).css({ left: sl+e.clientX-sx, top: st+e.clientY-sy });
            }).on('mouseup.aidrag', function() {
                $(document).off('mousemove.aidrag mouseup.aidrag');
            });
        });
    }

    function renderList(data, maxSec) {
        var now     = getServerTime().getTime();
        var visible = data.filter(function(r) {
            if (!r.arrivalMs) return false;
            return (r.arrivalMs - now) / 1000 <= maxSec;
        });

        $('#ai-badge').text(data.filter(function(r){ return r.arrivalMs; }).length);

        if (!visible.length) {
            $('#ai-list').html('<div style="text-align:center;padding:16px;color:#7c6200;">Aucune attaque entrante.</div>');
            return;
        }

        var html = '';
        visible.forEach(function(r, i) {
            var secLeft = r.arrivalMs ? (r.arrivalMs - now) / 1000 : 0;
            var colors  = urgencyColor(secLeft);
            var vUrl    = r.defId ? '/game.php?village='+r.defId+'&screen=overview' : '#';
            var xy      = (r.defCoord || '|').split('|');
            var mapUrl  = game_data.link_base_pure+'map&x='+xy[0]+'&y='+xy[1];
            var attTag  = r.attCoord ? '<span style="font-size:9px;color:#7f8c8d;">Att: '+r.attCoord+'</span>' : '';
            var timeStr = r.arrivalMs ? formatDateTime(new Date(r.arrivalMs)) : '??';
            var timerId = 'ai-t-'+i;

            html += '<div style="display:flex;align-items:center;gap:6px;padding:5px 2px;'
                + 'border-bottom:1px solid rgba(160,130,10,0.15);background:'+colors.bg+';">'
                + '<span style="width:8px;height:8px;border-radius:50%;background:'+colors.dot+';flex-shrink:0;"></span>'
                + '<div style="flex:1;min-width:0;">'
                    + '<div style="font-weight:bold;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'
                        + '<a href="'+vUrl+'" target="_blank" style="color:#3d2b00;text-decoration:none;">'+escapeHtml(r.defName)+'</a>'
                        + ' <span style="font-size:9px;color:#7c6200;">('+r.defCoord+')</span>'
                    + '</div>'
                    + '<div style="font-size:9px;color:#5a3e00;margin-top:1px;">'+attTag+' '+timeStr+'</div>'
                + '</div>'
                + '<span id="'+timerId+'" data-ms="'+(r.arrivalMs||0)+'" style="font-family:monospace;font-size:11px;font-weight:bold;color:'+colors.dot+';white-space:nowrap;flex-shrink:0;">'
                    + secondsToHms(secLeft)
                + '</span>'
                + '<a href="'+mapUrl+'" target="_blank" style="font-size:12px;color:#8a6f1e;text-decoration:none;flex-shrink:0;" title="Voir sur la carte">&#x1F5FA;</a>'
                + '</div>';
        });

        $('#ai-list').html(html);
        $('#ai-last-update').text('Mis à jour : '+formatDateTime(new Date(now)));

        clearInterval(window._aiTick);
        window._aiTick = setInterval(function() {
            var n = getServerTime().getTime();
            $('[id^="ai-t-"]').each(function() {
                var ms  = +$(this).data('ms');
                if (!ms) return;
                var sec = (ms - n) / 1000;
                $(this).text(sec <= 0 ? '00:00:00' : secondsToHms(sec));
                if (sec <= 60) $(this).css('color','#e74c3c');
            });
        }, 1000);
    }

    function loadAll() {
        $('#ai-refresh').text('...').prop('disabled', true);
        $('#ai-list').html('<div style="text-align:center;padding:16px;color:#7c6200;">Chargement...</div>');
        fetchIncomings().then(function(data) {
            window._aiData = data;
            var maxSec = +($('#ai-filter').val() || 999999);
            renderList(data, maxSec);
            $('#ai-refresh').html('&#x21BB;').prop('disabled', false);
        });
    }

    // ─── Point d'entrée ──────────────────────────────────────────────────────

    AllIncomings.init = function() {
        if (buildPanel() === false) return;   // 2e clic = fermeture
        loadAll();
    };

})(jQuery);

AllIncomings.init();
