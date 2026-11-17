/*
 * Script Name: Resource Overview
 * Version: v1.1
 * Author: Schadrac
 * Screen: overview_villages (aperçu des villages)
 * Description: Tableau récapitulatif des ressources de tous tes villages
 *              avec totaux, tri, et mise en évidence des villages en pénurie.
 */

var ResourceOverview = ResourceOverview || {};

(function ($) {

    var LS_PREFIX = 'schadrac_resourceOverview';

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function formatNum(n) {
        if (isNaN(n) || n === null) return '—';
        return Math.round(n).toLocaleString('fr-FR');
    }

    function parseNum(str) {
        if (!str) return 0;
        var m = String(str).match(/\d[\d\s.,\u00a0\u202f]*/);
        return m ? parseInt(m[0].replace(/[^\d]/g, ''), 10) || 0 : 0;
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
            return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
    }

    // ─── Récupération des ressources ──────────────────────────────────────────
    // La page overview_villages&mode=prod liste toutes les ressources courantes.

    function fetchResources() {
        return $.get(
            game_data.link_base_pure + 'overview_villages&mode=prod&page=-1'
        ).then(function(html) {
            var doc     = new DOMParser().parseFromString(html, 'text/html');
            var villages = [];

            // Cherche la table principale (généralement #production_table ou .overview_table)
            var $table = $(doc).find('#production_table, .overview_table').first();
            if (!$table.length) $table = $(doc).find('table.vis').first();

            // Identifie les colonnes par les icônes dans l'en-tête
            var colMap = { name: -1, coord: -1, wood: -1, clay: -1, iron: -1,
                           pop: -1, storage: -1 };

            // En-tête : <thead> ou, à défaut, la première ligne de <th>
            var $head = $table.find('thead tr').first();
            if (!$head.length) $head = $table.find('tr').has('th').first();
            $head.children('th, td').each(function(i) {
                var src = $(this).find('img').attr('src') || '';
                var txt = $(this).text().trim().toLowerCase();
                // \b…\b : « Ferme » ne doit PAS être pris pour « fer »
                if (src.match(/wood|holz/) || /\bbois\b/.test(txt))                 colMap.wood    = i;
                else if (src.match(/stone|lehm/) || /\bargile\b/.test(txt))         colMap.clay    = i;
                else if (src.match(/iron|eisen/) || /\bfer\b/.test(txt))            colMap.iron    = i;
                else if (src.match(/storage|speicher/) || /entrep|storage|speicher|armaz/.test(txt)) colMap.storage = i;
                else if (src.match(/farm|bauernhof/) || /\bferme\b|farm|bauernhof|fazenda/.test(txt)) colMap.pop = i;
                else if (/village|dorf|nom|aldeia/.test(txt))                      colMap.name    = i;
                else if (/coord|\|/.test(txt))                                    colMap.coord   = i;
            });

            $table.find('tr.nowrap, tr[id]').each(function() {
                var $tds = $(this).find('td');
                if ($tds.length < 3) return;

                // Nom + coord depuis le premier lien village
                var $vlink  = $(this).find('a[href*="info_village"], a[href*="village="]').first();
                var label   = $(this).find('.quickedit-label, .village-name').first().text().trim()
                           || $vlink.text().trim()
                           || $tds.eq(0).text().trim();
                // « Off 1 (500|500) K55 » → nom « Off 1 »
                var name    = label.replace(/\s*\(\d{1,3}\|\d{1,3}\)\s*(K\d+)?\s*$/, '').trim() || label;
                var href    = $vlink.attr('href') || '';
                var idM     = href.match(/village=(\d+)|id=(\d+)/);
                var id      = idM ? +(idM[1]||idM[2]) : null;

                // Coordonnées dans un lien info_village ou dans une cellule dédiée
                var coord = (label.match(/\d{1,3}\|\d{1,3}/) || [])[0]
                         || ($(this).find('a[href*="info_village"]').text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0]
                         || ($tds.eq(colMap.coord >= 0 ? colMap.coord : 1).text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0]
                         || '';

                // Ressources : 1) <span class="res wood|stone|iron"> (format actuel du jeu)
                //              2) colonnes identifiées par l'en-tête  3) icônes <img>
                var wood = 0, clay = 0, iron = 0, pop = 0;
                var $w = $(this).find('span.wood, .res.wood').first();
                var $c = $(this).find('span.stone, .res.stone').first();
                var $i = $(this).find('span.iron, .res.iron').first();

                if ($w.length || $c.length || $i.length) {
                    wood = parseNum($w.text()); clay = parseNum($c.text()); iron = parseNum($i.text());
                } else if (colMap.wood >= 0) {
                    wood = parseNum($tds.eq(colMap.wood).text());
                    clay = parseNum($tds.eq(colMap.clay).text());
                    iron = parseNum($tds.eq(colMap.iron).text());
                } else {
                    // Fallback : cherche les valeurs dans les spans avec icône ressource
                    $(this).find('img[src*="wood"], img[src*="holz"]').each(function() {
                        wood = parseNum($(this).next().text() || $(this).siblings('span, b').first().text());
                    });
                    $(this).find('img[src*="stone"], img[src*="lehm"]').each(function() {
                        clay = parseNum($(this).next().text() || $(this).siblings('span, b').first().text());
                    });
                    $(this).find('img[src*="iron"], img[src*="eisen"]').each(function() {
                        iron = parseNum($(this).next().text() || $(this).siblings('span, b').first().text());
                    });
                }

                if (colMap.pop >= 0) pop = parseNum($tds.eq(colMap.pop).text());   // population utilisée (avant « / »)

                // Capacité de l'entrepôt : colonne dédiée, sinon un élément « storage »
                var storage = colMap.storage >= 0 ? parseNum($tds.eq(colMap.storage).text()) : 0;
                if (!storage) $(this).find('[class*="storage"], [class*="lager"]').each(function() {
                    var m = $(this).text().match(/\/\s*([\d\s,.]+)/);
                    if (m) storage = parseNum(m[1]);
                });

                // Taux de production horaire (cherche dans les cellules avec "+")
                var rateWood = 0, rateClay = 0, rateIron = 0;
                $tds.each(function() {
                    var t = $(this).text().trim();
                    var m = t.match(/^\+?([\d\s,.]+)\/h$/);
                    if (m) {
                        if (!rateWood)      rateWood = parseNum(m[1]);
                        else if (!rateClay) rateClay = parseNum(m[1]);
                        else if (!rateIron) rateIron = parseNum(m[1]);
                    }
                });

                var total = wood + clay + iron;

                if ((coord || name) && (wood || clay || iron || id)) {
                    villages.push({
                        id:       id,
                        name:     name,
                        coord:    coord,
                        wood:     wood,
                        clay:     clay,
                        iron:     iron,
                        total:    total,
                        pop:      pop,
                        storage:  storage,
                        rateWood: rateWood,
                        rateClay: rateClay,
                        rateIron: rateIron,
                    });
                }
            });

            return villages;
        }, function() { return []; });
    }

    // ─── Interface ────────────────────────────────────────────────────────────

    var sortKey  = 'total';
    var sortDesc = true;
    var allData  = [];

    function buildUI() {
        if ($('#ro-block').length) { $('#ro-block').remove(); return; }

        var html = '<div id="ro-block" style="background:#f4e8c1;border:1px solid #603000;padding:12px;margin-bottom:15px;box-sizing:border-box;font-family:Verdana,sans-serif;font-size:11px;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">'
                + '<h2 style="margin:0;font-size:14px;color:#3d2b00;">&#128210; Resource Overview</h2>'
                + '<div style="display:flex;gap:8px;align-items:center;">'
                    + '<input id="ro-search" type="text" placeholder="Filtrer par nom/coord..." style="padding:4px 8px;border:1px solid #a0820a;border-radius:3px;font-size:11px;background:#fffbe8;width:180px;">'
                    + '<a href="javascript:void(0);" id="ro-refresh" class="btn btn-confirm-yes" style="padding:4px 10px;">&#x21BB; Charger</a>'
                + '</div>'
            + '</div>'

            + '<div id="ro-totals" style="display:none;margin-bottom:8px;padding:8px;background:#e8d49a;border-radius:3px;font-size:11px;gap:20px;flex-wrap:wrap;"></div>'

            + '<div style="overflow-x:auto;max-height:500px;overflow-y:auto;">'
            + '<table class="vis" id="ro-table" width="100%" style="border-collapse:separate;border-spacing:1px;font-size:11px;">'
            + '<thead id="ro-thead"><tr style="background:#c8a96e;position:sticky;top:0;">'
                + '<th style="padding:5px;text-align:left;cursor:pointer;" data-sort="name">Village &#9660;</th>'
                + '<th style="padding:5px;cursor:pointer;" data-sort="coord">Coord</th>'
                + '<th style="padding:5px;cursor:pointer;" data-sort="wood">&#127795; Bois</th>'
                + '<th style="padding:5px;cursor:pointer;" data-sort="clay">&#11039; Argile</th>'
                + '<th style="padding:5px;cursor:pointer;" data-sort="iron">&#9881; Fer</th>'
                + '<th style="padding:5px;cursor:pointer;background:#b8a05e;" data-sort="total">Total</th>'
                + '<th style="padding:5px;font-size:9px;">Prod/h</th>'
            + '</tr></thead>'
            + '<tbody id="ro-tbody"><tr><td colspan="7" style="text-align:center;padding:16px;color:#7c6200;">Cliquez "Charger" pour récupérer les ressources.</td></tr></tbody>'
            + '</table></div>'

            + '</div>';

        var $container = $('#contentContainer, #content_value').first();
        if ($container.length) {
            $container.prepend(html);
        } else {
            $('body').prepend(html);
        }

        $('#ro-refresh').on('click', function(e) {
            e.preventDefault();
            var $btn = $(this);
            if ($btn.data('busy')) return;
            $btn.data('busy', true).text('Chargement...');
            fetchResources().always(function() { $btn.data('busy', false); }).then(function(data) {
                allData = data;
                renderTable(allData);
                renderTotals(allData);
                $('#ro-refresh').html('&#x21BB; Charger').prop('disabled', false);
                if (!data.length) UI.InfoMessage('Aucune ressource trouvée. Exécutez ce script depuis l\'aperçu des villages (mode=prod).', 5000);
            });
        });

        $('#ro-thead th[data-sort]').on('click', function() {
            var key = $(this).data('sort');
            if (sortKey === key) { sortDesc = !sortDesc; }
            else { sortKey = key; sortDesc = true; }
            renderTable(filterData($('#ro-search').val()));
        });

        $('#ro-search').on('input', function() {
            renderTable(filterData($(this).val()));
        });
    }

    function filterData(query) {
        if (!query) return allData;
        query = query.toLowerCase();
        return allData.filter(function(v) {
            return v.name.toLowerCase().indexOf(query) >= 0
                || v.coord.indexOf(query) >= 0;
        });
    }

    function renderTable(data) {
        var sorted = data.slice().sort(function(a, b) {
            var av = a[sortKey], bv = b[sortKey];
            if (typeof av === 'string') return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
            return sortDesc ? bv - av : av - bv;
        });

        var $tbody = $('#ro-tbody').empty();
        if (!sorted.length) {
            $tbody.append('<tr><td colspan="7" style="text-align:center;padding:12px;color:#7c6200;">Aucun village.</td></tr>');
            return;
        }

        // Calcule le max total pour la barre de progression
        var maxTotal = Math.max.apply(null, sorted.map(function(v){ return v.total; })) || 1;

        sorted.forEach(function(v, i) {
            var bg      = i%2===0 ? '#fff5da' : '#f0e2be';
            var pct     = Math.round(v.total / maxTotal * 100);
            var vUrl    = v.id ? '/game.php?village='+v.id+'&screen=overview' : '#';
            // Pénurie : < 10 % de la capacité totale (3 ressources × capacité de l'entrepôt)
            var low     = v.storage && v.total < v.storage * 3 * 0.1 ? 'color:#e74c3c;' : '';
            var prodStr = (v.rateWood||v.rateClay||v.rateIron)
                ? '<span style="color:#7c6200;font-size:9px;">'+formatNum(v.rateWood)+'/'+formatNum(v.rateClay)+'/'+formatNum(v.rateIron)+'</span>'
                : '—';

            $tbody.append(
                '<tr style="background:'+bg+';">'
                +'<td style="padding:4px;"><a href="'+vUrl+'" target="_blank" style="color:#3d2b00;text-decoration:none;">'+escapeHtml(v.name)+'</a></td>'
                +'<td style="padding:4px;text-align:center;font-size:10px;color:#7c6200;">'+v.coord+'</td>'
                +'<td style="padding:4px;text-align:right;">'+formatNum(v.wood)+'</td>'
                +'<td style="padding:4px;text-align:right;">'+formatNum(v.clay)+'</td>'
                +'<td style="padding:4px;text-align:right;">'+formatNum(v.iron)+'</td>'
                +'<td style="padding:4px;text-align:right;font-weight:bold;'+low+'">'
                    + '<div style="position:relative;">'
                    + '<div style="position:absolute;left:0;top:0;height:100%;width:'+pct+'%;background:rgba(160,130,10,0.15);border-radius:2px;"></div>'
                    + '<span style="position:relative;">'+formatNum(v.total)+'</span>'
                    + '</div>'
                +'</td>'
                +'<td style="padding:4px;text-align:center;">'+prodStr+'</td>'
                +'</tr>'
            );
        });
    }

    function renderTotals(data) {
        if (!data.length) return;
        var totalWood  = data.reduce(function(s,v){ return s+v.wood; }, 0);
        var totalClay  = data.reduce(function(s,v){ return s+v.clay; }, 0);
        var totalIron  = data.reduce(function(s,v){ return s+v.iron; }, 0);
        var grandTotal = totalWood + totalClay + totalIron;
        var avgTotal   = data.length ? Math.round(grandTotal/data.length) : 0;

        $('#ro-totals').html(
            '<span><strong>Villages :</strong> '+data.length+'</span>'
            +'<span>&#127795; <strong>Bois :</strong> '+formatNum(totalWood)+'</span>'
            +'<span>&#11039; <strong>Argile :</strong> '+formatNum(totalClay)+'</span>'
            +'<span>&#9881; <strong>Fer :</strong> '+formatNum(totalIron)+'</span>'
            +'<span style="color:#3d2b00;font-weight:bold;">Total : '+formatNum(grandTotal)+'</span>'
            +'<span style="color:#7c6200;font-size:10px;">Moy/village : '+formatNum(avgTotal)+'</span>'
        ).css('display', 'flex');
    }

    // ─── Point d'entrée ──────────────────────────────────────────────────────

    ResourceOverview.init = function() {
        buildUI();
    };

})(jQuery);

ResourceOverview.init();
