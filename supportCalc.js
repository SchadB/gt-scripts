/*
 * Script Name: Support Calculator
 * Version: v1.1
 * Author: Schadrac
 * Screen: n'importe (fonctionne partout)
 * Description: Calcule quels villages alliés ou propres peuvent envoyer du soutien
 *              à un village défensif avant une deadline donnée.
 */

var SupportCalc = SupportCalc || {};

(function ($) {

    var LS_PREFIX   = 'schadrac_supportCalc';
    var UNIT_SPEEDS = {};
    var myVillages  = [];

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function getServerTime() {
        var t = $('#serverTime').text().trim().split(':');
        var d = $('#serverDate').text().trim().split('/');
        return new Date(+d[2], +d[1]-1, +d[0], +t[0], +t[1], +t[2]);
    }

    function pad(n) { return ('0'+n).slice(-2); }

    // jj/mm/aaaa HH:mm[:ss[:mmm]] → timestamp, ou NaN si le format est mauvais
    function parseDatetime(str) {
        var m = String(str || '').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[:.](\d{1,3}))?)?$/);
        if (!m) return NaN;
        var d = new Date(+m[3], +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0), +(m[6]||0), +(m[7]||0));
        if (d.getDate() !== +m[1] || d.getMonth() !== +m[2]-1 || +(m[4]||0) > 23 || +(m[6]||0) > 59) return NaN;
        return d.getTime();
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
            return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
    }

    // Extrait « x|y » valide (0–999) d'une saisie libre, ex. « Village (500|500) K55 »
    function extractCoord(str) {
        var m = String(str || '').match(/(?:^|[^\d])(\d{1,3})\|(\d{1,3})(?![\d])/);
        return m ? (+m[1]) + '|' + (+m[2]) : null;
    }

    function formatDateTime(date) {
        return pad(date.getDate())+'/'+pad(date.getMonth()+1)+'/'+date.getFullYear()
            +' '+pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds());
    }

    function secondsToHms(sec) {
        sec = Math.max(0, Math.floor(sec));
        return pad(Math.floor(sec/3600))+':'+pad(Math.floor((sec%3600)/60))+':'+pad(sec%60);
    }

    function calcDist(c1, c2) {
        var a = c1.split('|'), b = c2.split('|');
        return Math.sqrt(Math.pow(+a[0]-+b[0],2)+Math.pow(+a[1]-+b[1],2));
    }

    function travelSec(dist, unit, sigilPct) {
        var speed = UNIT_SPEEDS[unit] || 10;
        return Math.round(dist * speed * 60 / (1 + sigilPct/100));   // arrondi à la seconde comme le jeu
    }

    // ─── Données ──────────────────────────────────────────────────────────────

    function fetchUnitInfo() {
        return $.ajax({ url: '/interface.php?func=get_unit_info', dataType: 'xml' }).then(function(xml) {
            $(xml).find('config').children().each(function() {
                var speed = parseFloat($(this).find('speed').text());
                if (!isNaN(speed) && speed > 0) UNIT_SPEEDS[$(this).prop('nodeName')] = speed;
            });
            try { localStorage.setItem(LS_PREFIX+'_speeds', JSON.stringify({ ts: Date.now(), data: UNIT_SPEEDS })); } catch (e) {}
        });
    }

    // Cache 24 h ; ignoré s'il est vide/ancien format (sinon vitesse par défaut à vie)
    function loadUnitInfo() {
        try {
            var c = JSON.parse(localStorage.getItem(LS_PREFIX+'_speeds') || 'null');
            if (c && c.ts && Date.now() - c.ts < 86400000 && c.data && c.data.spear) {
                UNIT_SPEEDS = c.data;
                return $.Deferred().resolve().promise();
            }
        } catch (e) {}
        return fetchUnitInfo();
    }

    function fetchMyVillages(groupId) {
        var url = game_data.link_base_pure + 'groups&ajax=load_villages_from_group';
        if (game_data.player.sitter > 0) url += '&t='+game_data.player.id;
        return $.ajax({
            method: 'POST', url: url,
            data: { group_id: groupId }, dataType: 'json',
            headers: { 'TribalWars-Ajax': 1 }
        }).then(function(res) {
            var html = res && res.response && res.response.html;
            if (!html) return [];
            var doc  = new DOMParser().parseFromString(html, 'text/html');
            var list = [];
            $(doc).find('#group_table tbody tr').each(function() {
                var $a    = $(this).find('td:eq(0) a');
                var href  = $a.attr('href') || '';
                var idM   = href.match(/[?&]village=(\d+)/) || href.match(/[?&]id=(\d+)/);
                var id    = $a.attr('data-village-id') || (idM ? idM[1] : null);
                var name  = $(this).find('td:eq(0)').text().trim();
                var coord = ($(this).find('td:eq(1)').text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0];
                if (id && coord) list.push({ id: +id, name: name, coord: coord });
            });
            return list;
        });
    }

    function fetchGroups() {
        var url = game_data.link_base_pure + 'groups&mode=overview&ajax=load_group_menu';
        if (game_data.player.sitter > 0) url += '&t='+game_data.player.id;
        return $.get(url);
    }

    // ─── Calcul ───────────────────────────────────────────────────────────────

    function calcSupport(targetCoord, deadlineMs, unit, sigilPct) {
        var now     = getServerTime().getTime();
        var results = [];

        myVillages.forEach(function(v) {
            var dist     = calcDist(v.coord, targetCoord);
            if (dist === 0) return;
            var secTravel = travelSec(dist, unit, sigilPct);
            var launchMs  = deadlineMs - secTravel * 1000;
            var secLeft   = (launchMs - now) / 1000;

            results.push({
                village:  v,
                dist:     dist,
                launchMs: launchMs,
                secLeft:  secLeft,
                canSend:  launchMs > now,
            });
        });

        results.sort(function(a, b) { return b.secLeft - a.secLeft; });
        return results;
    }

    // ─── Interface ────────────────────────────────────────────────────────────

    function buildPanel() {
        if ($('#sc-panel').length) { clearInterval(window._scTick); $('#sc-panel').remove(); return; }

        var html = '<div id="sc-panel" style="'
            + 'position:fixed;top:70px;right:12px;width:420px;'
            + 'background:#f4e8c1;border:2px solid #a0820a;border-radius:5px;'
            + 'box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:99999;'
            + 'font-family:Verdana,sans-serif;font-size:11px;">'

            + '<div id="sc-header" style="background:#1a5c1a;color:#fff;padding:8px 12px;'
                + 'border-radius:3px 3px 0 0;display:flex;align-items:center;'
                + 'justify-content:space-between;cursor:move;">'
                + '<strong>&#128737; Support Calculator</strong>'
                + '<span id="sc-close" style="cursor:pointer;font-size:16px;">&#x2715;</span>'
            + '</div>'

            + '<div style="padding:10px;background:#e8d49a;border-bottom:1px solid #c9a800;">'

                + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'
                    + '<div><label style="display:block;font-size:10px;font-weight:bold;color:#5a3e00;margin-bottom:3px;">Village à défendre (coord)</label>'
                        + '<input id="sc-target" type="text" placeholder="ex: 500|500" style="width:100%;padding:4px 6px;border:1px solid #a0820a;border-radius:3px;font-size:12px;background:#fffbe8;"></div>'
                    + '<div><label style="display:block;font-size:10px;font-weight:bold;color:#5a3e00;margin-bottom:3px;">Deadline d\'arrivée</label>'
                        + '<input id="sc-deadline" type="text" placeholder="jj/mm/aaaa HH:mm:ss" style="width:100%;padding:4px 6px;border:1px solid #a0820a;border-radius:3px;font-size:12px;background:#fffbe8;"></div>'
                + '</div>'

                + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">'
                    + '<div><label style="display:block;font-size:10px;font-weight:bold;color:#5a3e00;margin-bottom:3px;">Unité de soutien</label>'
                        + '<select id="sc-unit" style="width:100%;padding:4px;border:1px solid #a0820a;border-radius:3px;background:#fffbe8;font-size:11px;">'
                        + '<option value="spear">Lancier</option>'
                        + '<option value="sword">Épéiste</option>'
                        + '<option value="heavy" selected>Cavalier lourd</option>'
                        + '<option value="archer">Archer</option>'
                        + '<option value="marcher">Archer monté</option>'
                        + '<option value="knight">Paladin</option>'
                        + '</select></div>'
                    + '<div><label style="display:block;font-size:10px;font-weight:bold;color:#5a3e00;margin-bottom:3px;">Bonus vitesse (%)</label>'
                        + '<input id="sc-sigil" type="text" value="0" style="width:100%;padding:4px 6px;border:1px solid #a0820a;border-radius:3px;font-size:12px;background:#fffbe8;"></div>'
                    + '<div><label style="display:block;font-size:10px;font-weight:bold;color:#5a3e00;margin-bottom:3px;">Groupe</label>'
                        + '<select id="sc-group" style="width:100%;padding:4px;border:1px solid #a0820a;border-radius:3px;background:#fffbe8;font-size:11px;"></select></div>'
                + '</div>'

                + '<button id="sc-calc" style="width:100%;padding:6px;background:#1a5c1a;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:12px;font-family:Verdana,sans-serif;">Calculer le soutien possible</button>'
            + '</div>'

            + '<div id="sc-results" style="max-height:340px;overflow-y:auto;padding:6px 8px;display:none;">'
            + '</div>'

            + '</div>';

        $('body').append(html);

        makeDraggable(document.getElementById('sc-panel'), document.getElementById('sc-header'));

        $('#sc-close').on('click', function() {
            clearInterval(window._scTick);
            $('#sc-panel').remove();
        });

        // Charge groupes
        fetchGroups().then(function(data) {
            var groups = ((data && data.result) || []).filter(function(g) { return g.type !== 'separator' && g.group_id !== undefined; });
            var opts = '';
            groups.forEach(function(g) {
                opts += '<option value="'+g.group_id+'">'+escapeHtml(g.name)+'</option>';
            });
            $('#sc-group').html(opts);
            // Charge mes villages du 1er vrai groupe (pas un séparateur)
            fetchMyVillages(groups[0] ? groups[0].group_id : 0).then(function(list) {
                myVillages = list;
            });
        }, function() { UI.ErrorMessage('Erreur lors du chargement des groupes.'); });

        $('#sc-group').on('change', function() {
            fetchMyVillages($(this).val()).then(function(list) { myVillages = list; });
        });

        $('#sc-calc').on('click', function() {
            var targetCoord = extractCoord($('#sc-target').val());
            var deadlineStr = $('#sc-deadline').val().trim();
            var unit        = $('#sc-unit').val();
            var sigilPct    = parseFloat($('#sc-sigil').val()) || 0;

            if (!targetCoord) {
                UI.ErrorMessage('Entrez des coordonnées valides (ex: 500|500).'); return;
            }
            if (!deadlineStr) { UI.ErrorMessage('Entrez une deadline.'); return; }

            var deadlineMs = parseDatetime(deadlineStr);
            var now        = getServerTime().getTime();
            if (isNaN(deadlineMs)) { UI.ErrorMessage('Format de date invalide. Exemple : 17/11/2026 22:00:00'); return; }

            if (deadlineMs <= now) { UI.ErrorMessage('La deadline est déjà passée.'); return; }
            if (!myVillages.length) { UI.ErrorMessage('Chargement des villages en cours, réessayez.'); return; }

            var results = calcSupport(targetCoord, deadlineMs, unit, sigilPct);
            renderResults(results, targetCoord, deadlineMs);
        });
    }

    function makeDraggable(el, handle) {
        var sx, sy, sl, st;
        $(handle).on('mousedown', function(e) {
            e.preventDefault();
            sx = e.clientX; sy = e.clientY;
            sl = parseInt($(el).css('left')) || (window.innerWidth - $(el).outerWidth() - 12);
            st = parseInt($(el).css('top')) || 70;
            $(el).css({ left: sl, right: 'auto' });
            $(document).on('mousemove.scdrag', function(e) {
                $(el).css({ left: sl+e.clientX-sx, top: st+e.clientY-sy });
            }).on('mouseup.scdrag', function() {
                $(document).off('mousemove.scdrag mouseup.scdrag');
            });
        });
    }

    function renderResults(results, targetCoord, deadlineMs) {
        var now     = getServerTime().getTime();
        var canSend = results.filter(function(r){ return r.canSend; });
        var cantSend = results.filter(function(r){ return !r.canSend; });

        var html = '<div style="margin-bottom:6px;font-size:10px;color:#5a3e00;">'
            + '<strong style="color:'+(canSend.length?'#27ae60':'#e74c3c')+'">'
            + canSend.length+'</strong> village(s) peuvent encore envoyer | '
            + '<span style="color:#e74c3c;">'+cantSend.length+' trop loin</span>'
            + '</div>';

        if (canSend.length) {
            html += '<table class="vis" width="100%" style="font-size:10px;border-collapse:separate;border-spacing:2px;">'
                + '<thead><tr style="background:#1a5c1a;color:#fff;">'
                    + '<th style="padding:3px;text-align:left;">Village</th>'
                    + '<th style="padding:3px;">Distance</th>'
                    + '<th style="padding:3px;">Envoyer avant</th>'
                    + '<th style="padding:3px;">Temps restant</th>'
                    + '<th style="padding:3px;">Envoyer</th>'
                + '</tr></thead><tbody>';

            canSend.forEach(function(r, i) {
                var parts   = targetCoord.split('|');
                var sitter  = game_data.player.sitter > 0 ? 't='+game_data.player.id+'&' : '';
                var url     = '/game.php?'+sitter+'village='+r.village.id+'&screen=place&x='+parts[0]+'&y='+parts[1];
                var bg      = i%2===0 ? '#e8f4e8' : '#d4ead4';
                var sec     = (r.launchMs - now) / 1000;

                html += '<tr style="background:'+bg+';">'
                    + '<td style="padding:3px;font-size:10px;">'+escapeHtml(r.village.name)+' ('+r.village.coord+')</td>'
                    + '<td style="padding:3px;text-align:center;">'+r.dist.toFixed(2)+'</td>'
                    + '<td style="padding:3px;text-align:center;font-size:9px;">'+formatDateTime(new Date(r.launchMs))+'</td>'
                    + '<td style="padding:3px;text-align:center;font-family:monospace;" class="sc-timer" data-ms="'+r.launchMs+'">'+secondsToHms(sec)+'</td>'
                    + '<td style="padding:3px;text-align:center;"><a href="'+url+'" target="_blank" class="btn btn-confirm-yes" style="padding:2px 6px;font-size:10px;">&#9658;</a></td>'
                    + '</tr>';
            });

            html += '</tbody></table>';
        }

        if (cantSend.length) {
            html += '<details style="margin-top:8px;">'
                + '<summary style="cursor:pointer;font-size:10px;color:#e74c3c;">&#9660; '+cantSend.length+' village(s) trop loin pour arriver à temps</summary>'
                + '<table class="vis" width="100%" style="font-size:9px;margin-top:4px;">'
                + '<thead><tr style="background:#c9a800;"><th>Village</th><th>Distance</th><th>Il manquait</th></tr></thead><tbody>';
            cantSend.slice(0, 20).forEach(function(r) {
                html += '<tr style="background:#fff5da;">'
                    + '<td style="padding:2px;">'+escapeHtml(r.village.name)+' ('+r.village.coord+')</td>'
                    + '<td style="padding:2px;text-align:center;">'+r.dist.toFixed(2)+'</td>'
                    + '<td style="padding:2px;text-align:center;color:#e74c3c;">'+secondsToHms(Math.abs(r.secLeft))+'</td>'
                    + '</tr>';
            });
            html += '</tbody></table></details>';
        }

        $('#sc-results').html(html).show();

        clearInterval(window._scTick);
        window._scTick = setInterval(function() {
            var n = getServerTime().getTime();
            $('.sc-timer').each(function() {
                var sec = (+$(this).data('ms') - n) / 1000;
                $(this).text(sec <= 0 ? '00:00:00' : secondsToHms(sec));
                if (sec < 300) $(this).css('color','#e74c3c');
            });
        }, 1000);
    }

    // ─── Point d'entrée ──────────────────────────────────────────────────────

    SupportCalc.init = function() {
        loadUnitInfo().then(function() {
            buildPanel();
        });
    };

})(jQuery);

SupportCalc.init();
