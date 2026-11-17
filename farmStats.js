/*
 * Script Name: Farm Stats
 * Version: v1.1
 * Author: Schadrac
 * Screen: rapport (report)
 * Description: Analyse tes rapports d'attaque et affiche des statistiques de pillage
 *              par village ciblé et par village attaquant.
 */

var FarmStats = FarmStats || {};

(function ($) {

    var MAX_PAGES = 10; // nombre de pages de rapports à analyser

    function getServerTime() {
        var t = $('#serverTime').text().trim().split(':');
        var d = $('#serverDate').text().trim().split('/');
        return new Date(+d[2], +d[1]-1, +d[0], +t[0], +t[1], +t[2]);
    }

    function pad(n) { return ('0'+n).slice(-2); }

    function formatNum(n) { return n.toLocaleString('fr-FR'); }

    // Délai entre deux requêtes : le jeu tolère ~5 requêtes/s, au-delà → captcha / blocage.
    var CFG = window.FarmStatsConfig || {};
    var REQUEST_DELAY = CFG.delay != null ? CFG.delay : 220;

    function sleep(ms) { var d = $.Deferred(); setTimeout(d.resolve, ms); return d.promise(); }

    function parseNum(str) {
        var m = String(str || '').match(/\d[\d.,\s  ]*/);
        return m ? parseInt(m[0].replace(/[^\d]/g, ''), 10) || 0 : 0;
    }

    // ─── Liste des rapports d'attaque (sujets uniquement : la liste n'affiche pas le butin)
    // Sujet type : « Off 1 (500|500) K55 attaque Village barbare (490|490) K44 »
    function fetchReportListPage(from) {
        return $.get(
            game_data.link_base_pure + 'report&mode=attack&from=' + from
        ).then(function(html) {
            var doc  = new DOMParser().parseFromString(html, 'text/html');
            var rows = [];
            $(doc).find('#report_list tr').each(function() {
                var $row  = $(this);
                var $link = $row.find('a[href*="view="]').first();
                var idM   = ($link.attr('href') || '').match(/view=(\d+)/);
                if (!idM) return;
                var subject = ($row.find('.quickedit-label').first().text() || $link.text()).replace(/\s+/g, ' ').trim();
                var coords  = subject.match(/\d{1,3}\|\d{1,3}/g) || [];
                rows.push({
                    id:        +idM[1],
                    reportUrl: $link.attr('href'),
                    attCoord:  coords.length >= 2 ? coords[0] : '',
                    defCoord:  coords.length ? coords[coords.length - 1] : '',
                    timeStr:   $row.find('td').last().text().trim(),
                    wood: 0, clay: 0, iron: 0, total: 0,
                });
            });
            return rows;
        }, function() { return []; });
    }

    // ─── Butin d'un rapport (ligne « Butin » de #attack_results)
    function fetchLoot(row) {
        return $.get(row.reportUrl).then(function(html) {
            var $res = $(new DOMParser().parseFromString(html, 'text/html')).find('#attack_results');
            function val(cls) {
                var $ic = $res.find('.icon.header.' + cls + ', span.' + cls).first();
                return $ic.length ? parseNum($ic.parent().text()) : 0;
            }
            row.wood = val('wood'); row.clay = val('stone'); row.iron = val('iron');
            row.total = row.wood + row.clay + row.iron;
            return row;
        }, function() { return row; });
    }

    // Pages lues l'une après l'autre (pagination « from »), sans doublons ; puis butin de chaque rapport.
    function fetchAllReports(maxPages, onProgress) {
        var seen = {}, all = [], dfd = $.Deferred();

        function nextPage(page, from) {
            if (page >= maxPages) return loot(0);
            onProgress('pages', page, maxPages);
            fetchReportListPage(from).then(function(rows) {
                var fresh = rows.filter(function(r) { if (seen[r.id]) return false; seen[r.id] = true; return true; });
                all = all.concat(fresh);
                if (!fresh.length) return loot(0);           // fin de liste (ou page identique)
                sleep(REQUEST_DELAY).then(function() { nextPage(page + 1, from + rows.length); });
            });
        }
        function loot(i) {
            if (i >= all.length) return dfd.resolve(all);
            onProgress('loot', i, all.length);
            fetchLoot(all[i]).then(function() {
                sleep(REQUEST_DELAY).then(function() { loot(i + 1); });
            });
        }
        nextPage(0, 0);
        return dfd.promise();
    }

    // ─── Agrégation par village cible ─────────────────────────────────────────

    function aggregate(rows) {
        var byTarget = {};
        var bySource = {};

        rows.forEach(function(r) {
            if (!r.defCoord) return;

            if (!byTarget[r.defCoord]) byTarget[r.defCoord] = { coord: r.defCoord, runs: 0, wood: 0, clay: 0, iron: 0, total: 0 };
            byTarget[r.defCoord].runs++;
            byTarget[r.defCoord].wood  += r.wood;
            byTarget[r.defCoord].clay  += r.clay;
            byTarget[r.defCoord].iron  += r.iron;
            byTarget[r.defCoord].total += r.total;

            if (r.attCoord) {
                if (!bySource[r.attCoord]) bySource[r.attCoord] = { coord: r.attCoord, runs: 0, wood: 0, clay: 0, iron: 0, total: 0 };
                bySource[r.attCoord].runs++;
                bySource[r.attCoord].wood  += r.wood;
                bySource[r.attCoord].clay  += r.clay;
                bySource[r.attCoord].iron  += r.iron;
                bySource[r.attCoord].total += r.total;
            }
        });

        var targets = Object.values(byTarget).sort(function(a,b){ return b.total-a.total; });
        var sources = Object.values(bySource).sort(function(a,b){ return b.total-a.total; });

        return { targets: targets, sources: sources, total: rows.length };
    }

    // ─── Interface ────────────────────────────────────────────────────────────

    function buildUI() {
        if ($('#fs-block').length) { $('#fs-block').remove(); return; }

        var html = '<div id="fs-block" style="background:#f4e8c1;border:1px solid #603000;padding:12px;margin-bottom:15px;box-sizing:border-box;font-family:Verdana,sans-serif;font-size:11px;">'
            + '<h2 style="margin:0 0 10px;font-size:14px;color:#3d2b00;">&#128196; Farm Stats — Analyse des rapports d\'attaque</h2>'

            + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'
                + '<label style="color:#5a3e00;">Pages analysées :</label>'
                + '<input id="fs-pages" type="number" value="'+MAX_PAGES+'" min="1" max="50" style="width:60px;padding:3px 6px;border:1px solid #a0820a;border-radius:3px;">'
                + ' <a href="javascript:void(0);" id="fs-analyze" class="btn btn-confirm-yes" style="padding:4px 12px;">Analyser les rapports</a>'
            + '</div>'

            + '<div style="font-size:9px;color:#7c6200;margin:-4px 0 8px;">Chaque rapport est ouvert pour lire le butin (≈ 5 rapports/s, pour rester sous la limite du jeu).</div>'
            + '<div id="fs-progress" style="display:none;color:#7c6200;font-size:10px;margin-bottom:8px;"></div>'

            + '<div id="fs-results" style="display:none;">'
                + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'

                    + '<div>'
                        + '<h3 style="font-size:12px;color:#7c3000;border-bottom:1px solid #c9a800;padding-bottom:4px;margin:0 0 6px;">&#127979; Meilleures fermes (villages cibles)</h3>'
                        + '<div style="overflow-x:auto;max-height:300px;overflow-y:auto;">'
                        + '<table class="vis" id="fs-target-table" width="100%" style="font-size:10px;">'
                        + '<thead><tr style="background:#c8a96e;">'
                            + '<th>#</th><th>Coord</th><th>Raids</th>'
                            + '<th>🪵</th><th>🪨</th><th>⚙️</th><th style="color:#3d2b00;font-weight:bold;">Total</th>'
                            + '<th>Moy/raid</th>'
                        + '</tr></thead><tbody id="fs-target-body"></tbody>'
                        + '</table></div>'
                    + '</div>'

                    + '<div>'
                        + '<h3 style="font-size:12px;color:#7c3000;border-bottom:1px solid #c9a800;padding-bottom:4px;margin:0 0 6px;">&#9876; Mes meilleurs villages attaquants</h3>'
                        + '<div style="overflow-x:auto;max-height:300px;overflow-y:auto;">'
                        + '<table class="vis" id="fs-source-table" width="100%" style="font-size:10px;">'
                        + '<thead><tr style="background:#c8a96e;">'
                            + '<th>#</th><th>Coord</th><th>Raids</th>'
                            + '<th>Total pillé</th><th>Moy/raid</th>'
                        + '</tr></thead><tbody id="fs-source-body"></tbody>'
                        + '</table></div>'
                    + '</div>'

                + '</div>'

                + '<div id="fs-totals" style="margin-top:10px;padding:8px;background:#e8d49a;border-radius:3px;font-size:11px;"></div>'
            + '</div>'

            + '</div>';

        $('#contentContainer, #content_value').first().prepend(html);

        $('#fs-analyze').on('click', function(e) {
            e.preventDefault();
            var $btn = $(this);
            if ($btn.data('busy')) return;          // un <a> ignore « disabled » : on bloque les doubles clics
            MAX_PAGES = Math.max(1, Math.min(50, parseInt($('#fs-pages').val(), 10) || 10));
            $btn.data('busy', true).text('Analyse...');
            $('#fs-progress').show().text('Lecture de la liste des rapports...');
            $('#fs-results').hide();

            fetchAllReports(MAX_PAGES, function(step, done, total) {
                $('#fs-progress').text(step === 'pages'
                    ? 'Lecture de la liste des rapports (page ' + (done + 1) + '/' + total + ')...'
                    : 'Lecture du butin (' + done + '/' + total + ' rapports)...');
            }).then(function(rows) {
                renderResults(aggregate(rows));
                $('#fs-progress').hide();
                $('#fs-results').show();
            }).always(function() {
                $btn.data('busy', false).text('Analyser les rapports');
            });
        });
    }

    function renderResults(agg) {
        var $tbody = $('#fs-target-body').empty();
        agg.targets.slice(0, 30).forEach(function(r, i) {
            var avg  = r.runs ? Math.round(r.total/r.runs) : 0;
            var url  = game_data.link_base_pure + 'map&x='+r.coord.split('|')[0]+'&y='+r.coord.split('|')[1];
            var bg   = i%2===0 ? '#fff5da' : '#f0e2be';
            $tbody.append(
                '<tr style="background:'+bg+';">'
                +'<td style="padding:3px;text-align:center;color:#7c6200;">'+(i+1)+'</td>'
                +'<td style="padding:3px;"><a href="'+url+'" target="_blank" style="color:#3d2b00;">'+r.coord+'</a></td>'
                +'<td style="padding:3px;text-align:center;">'+r.runs+'</td>'
                +'<td style="padding:3px;text-align:right;color:#8B4513;">'+formatNum(r.wood)+'</td>'
                +'<td style="padding:3px;text-align:right;color:#808080;">'+formatNum(r.clay)+'</td>'
                +'<td style="padding:3px;text-align:right;color:#696969;">'+formatNum(r.iron)+'</td>'
                +'<td style="padding:3px;text-align:right;font-weight:bold;">'+formatNum(r.total)+'</td>'
                +'<td style="padding:3px;text-align:right;color:#7c6200;">'+formatNum(avg)+'</td>'
                +'</tr>'
            );
        });

        var $sbody = $('#fs-source-body').empty();
        agg.sources.slice(0, 20).forEach(function(r, i) {
            var avg = r.runs ? Math.round(r.total/r.runs) : 0;
            var bg  = i%2===0 ? '#fff5da' : '#f0e2be';
            $sbody.append(
                '<tr style="background:'+bg+';">'
                +'<td style="padding:3px;text-align:center;color:#7c6200;">'+(i+1)+'</td>'
                +'<td style="padding:3px;">'+r.coord+'</td>'
                +'<td style="padding:3px;text-align:center;">'+r.runs+'</td>'
                +'<td style="padding:3px;text-align:right;font-weight:bold;">'+formatNum(r.total)+'</td>'
                +'<td style="padding:3px;text-align:right;color:#7c6200;">'+formatNum(avg)+'</td>'
                +'</tr>'
            );
        });

        var grandTotal = agg.targets.reduce(function(s,r){ return s+r.total; }, 0);
        var grandRuns  = agg.total;
        $('#fs-totals').html(
            '<strong>Résumé :</strong> '
            + grandRuns+' rapports analysés &nbsp;|&nbsp; '
            + '<strong>'+formatNum(grandTotal)+'</strong> ressources pillées au total &nbsp;|&nbsp; '
            + 'Moyenne : <strong>'+formatNum(grandRuns ? Math.round(grandTotal/grandRuns) : 0)+'</strong> par raid'
        );
    }

    // ─── Point d'entrée ──────────────────────────────────────────────────────

    FarmStats.init = function() {
        if (game_data.screen !== 'report' && game_data.screen !== 'overview') {
            UI.InfoMessage('Farm Stats — Exécutez ce script depuis la page des rapports.', 4000);
        }
        buildUI();
    };

})(jQuery);

FarmStats.init();
