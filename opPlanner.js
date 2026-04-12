// OP Planner — v1.0
// Planificateur d'opérations coordonnées multi-villages
// Auteur : Schadrac
// Inspiré de Single Village Snipe par RedAlert

var scriptData = {
    prefix: 'opPlanner',
    name: 'OP Planner',
    version: 'v1.0',
    author: 'Schadrac',
};

var LS_PREFIX = 'schadrac_opPlanner';

// ─── Vitesses des unités (minutes par champ) ─────────────────────────────────
var UNIT_SPEEDS = {};
var UNIT_INFO   = {};

// ─── Couleurs par template d'attaque ─────────────────────────────────────────
var TEMPLATE_COLORS = {
    nuke:  '#c0392b',
    off:   '#e67e22',
    fake:  '#7f8c8d',
    noble: '#8e44ad',
    snipe: '#2980b9',
};

// ─── Données globales ─────────────────────────────────────────────────────────
var myVillages     = [];   // villages du joueur connecté
var targetVillages = [];   // villages du joueur ciblé
var plan           = [];   // résultat du calcul

// ─── Traductions ──────────────────────────────────────────────────────────────
var translations = {
    fr_FR: {
        title:           'OP Planner — Planificateur d\'opération',
        landingTime:     'Heure d\'arrivée souhaitée (jj/mm/aaaa HH:mm:ss)',
        attackType:      'Type d\'attaque',
        unit:            'Unité de référence (vitesse)',
        minUnits:        'Minimum d\'unités',
        group:           'Groupe de villages',
        calculate:       'Calculer les envois',
        exportBB:        'Exporter BB Code',
        exportCSV:       'Exporter CSV',
        copyAll:         'Copier tout',
        from:            'Depuis',
        target:          'Cible',
        distance:        'Distance',
        launchTime:      'Heure d\'envoi',
        sendIn:          'Envoi dans',
        send:            'Envoyer',
        noResults:       'Aucun envoi possible avec ces paramètres.',
        wrongScreen:     'Ce script doit être exécuté depuis le profil d\'un joueur (page info_player).',
        fetchError:      'Erreur lors de la récupération des données.',
        copied:          'Copié !',
        nothingToExport: 'Rien à exporter.',
        attacks:         'attaque(s) planifiée(s)',
        nuke:            'Nuke (full off)',
        off:             'Offensif léger',
        fake:            'Fake',
        noble:           'Noble train',
        snipe:           'Snipe défensif',
        targetVillages:  'Villages cibles',
        myGroup:         'Mes villages (groupe)',
        selectAll:       'Tout sélectionner',
        deselectAll:     'Tout désélectionner',
        premium:         'Ce script nécessite un compte Premium.',
        sigil:           'Bonus vitesse (%)',
    },
    en_DK: {
        title:           'OP Planner — Operation Planner',
        landingTime:     'Landing Time (dd/mm/yyyy HH:mm:ss)',
        attackType:      'Attack type',
        unit:            'Reference unit (speed)',
        minUnits:        'Minimum units',
        group:           'Village group',
        calculate:       'Calculate launch times',
        exportBB:        'Export BB Code',
        exportCSV:       'Export CSV',
        copyAll:         'Copy all',
        from:            'From',
        target:          'Target',
        distance:        'Distance',
        launchTime:      'Launch Time',
        sendIn:          'Send in',
        send:            'Send',
        noResults:       'No attacks can be planned with these settings.',
        wrongScreen:     'This script must be run from a player\'s profile page (info_player screen).',
        fetchError:      'Error fetching data.',
        copied:          'Copied!',
        nothingToExport: 'Nothing to export.',
        attacks:         'attack(s) planned',
        nuke:            'Nuke (full off)',
        off:             'Light offensive',
        fake:            'Fake',
        noble:           'Noble train',
        snipe:           'Defensive snipe',
        targetVillages:  'Target villages',
        myGroup:         'My villages (group)',
        selectAll:       'Select all',
        deselectAll:     'Deselect all',
        premium:         'This script requires a Premium account.',
        sigil:           'Speed bonus (%)',
    },
};

function tt(key) {
    var locale = (game_data.locale in translations) ? game_data.locale : 'en_DK';
    return translations[locale][key] || key;
}

// ─── Helpers temps ────────────────────────────────────────────────────────────

function getServerTime() {
    var t = $('#serverTime').text().trim();
    var d = $('#serverDate').text().trim().split('/');
    // d = [day, month, year]
    var parts = t.split(':');
    return new Date(+d[2], +d[1]-1, +d[0], +parts[0], +parts[1], +parts[2]);
}

function parseLandingTime(str) {
    // format: dd/mm/yyyy HH:mm:ss
    var parts = str.trim().split(' ');
    var dateParts = parts[0].split('/');
    var timeParts = parts[1].split(':');
    return new Date(
        +dateParts[2], +dateParts[1]-1, +dateParts[0],
        +timeParts[0], +timeParts[1], +timeParts[2]
    );
}

function formatDateTime(date) {
    var pad = function(n){ return ('0'+n).slice(-2); };
    return pad(date.getDate())+'/'+pad(date.getMonth()+1)+'/'+date.getFullYear()
        +' '+pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds());
}

function secondsToHms(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec/3600);
    var m = Math.floor((sec%3600)/60);
    var s = sec%60;
    return ('0'+h).slice(-2)+':'+('0'+m).slice(-2)+':'+('0'+s).slice(-2);
}

function calcDistance(c1, c2) {
    // c1, c2 = "xxx|yyy"
    var a = c1.split('|'), b = c2.split('|');
    var dx = +a[0] - +b[0], dy = +a[1] - +b[1];
    return Math.sqrt(dx*dx + dy*dy);
}

// ─── Récupération des données ─────────────────────────────────────────────────

function fetchUnitInfo() {
    return $.ajax({ url: '/interface.php?func=get_unit_info' }).then(function(xml) {
        $(xml).find('config').children().each(function() {
            var name  = $(this).prop('nodeName');
            var speed = parseFloat($(this).find('speed').text());
            UNIT_SPEEDS[name] = speed;
        });
        localStorage.setItem(LS_PREFIX+'_unitSpeeds', JSON.stringify(UNIT_SPEEDS));
        UNIT_INFO = UNIT_SPEEDS;
    });
}

function loadUnitInfo() {
    var stored = localStorage.getItem(LS_PREFIX+'_unitSpeeds');
    if (stored) {
        UNIT_SPEEDS = JSON.parse(stored);
        UNIT_INFO   = UNIT_SPEEDS;
        return $.Deferred().resolve().promise();
    }
    return fetchUnitInfo();
}

// Récupère les villages du joueur ciblé depuis sa page profil
function fetchTargetVillages() {
    var villages = [];
    // Table standard des villages sur la page profil
    $('#villages_list tr, #player_villages tr').each(function() {
        var $link = $(this).find('a[href*="info_village"]');
        var coord = $(this).find('td').eq(1).text().trim();
        if (!coord) coord = $link.text().match(/\d{1,3}\|\d{1,3}/)?.[0] || '';
        var id    = ($link.attr('href') || '').match(/id=(\d+)/)?.[1];
        if (coord && id) {
            villages.push({ id: +id, coord: coord });
        }
    });

    // Fallback : cherche toutes les coordonnées linkées vers info_village
    if (villages.length === 0) {
        $('a[href*="info_village"]').each(function() {
            var coord = $(this).text().trim().match(/\d{1,3}\|\d{1,3}/)?.[0];
            var id    = ($(this).attr('href') || '').match(/id=(\d+)/)?.[1];
            if (coord && id) {
                var exists = villages.some(function(v){ return v.id === +id; });
                if (!exists) villages.push({ id: +id, coord: coord });
            }
        });
    }
    return villages;
}

// Récupère les villages du joueur connecté via game_data + overview
function fetchMyVillages(groupId) {
    var url = game_data.link_base_pure
        + 'groups&ajax=load_villages_from_group';
    if (game_data.player.sitter > 0) url += '&t='+game_data.player.id;

    return $.post({
        url: url,
        data: { group_id: groupId },
        dataType: 'json',
        headers: { 'TribalWars-Ajax': 1 }
    }).then(function(res) {
        var parser = new DOMParser();
        var doc    = parser.parseFromString(res.response.html, 'text/html');
        var list   = [];
        $(doc).find('#group_table tbody tr').not(':first').each(function() {
            var $a    = $(this).find('td:eq(0) a');
            var id    = $a.attr('data-village-id') || ($a.attr('href')||'').match(/\d+/)?.[0];
            var name  = $(this).find('td:eq(0)').text().trim();
            var coord = $(this).find('td:eq(1)').text().trim();
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

// Récupère les troupes dispo pour mes villages
function fetchMyTroops(groupId) {
    return $.get(
        game_data.link_base_pure + 'overview_villages&mode=combined&group='+groupId+'&page=-1'
    ).then(function(html) {
        var $doc  = $($.parseHTML(html));
        var troops = {};
        var header = [];

        $doc.find('#combined_table tr:eq(0) th').each(function() {
            var src = $(this).find('img').attr('src') || '';
            var match = src.match(/unit_(\w+)\./);
            header.push(match ? match[1] : null);
        });

        $doc.find('#combined_table tr.nowrap').each(function() {
            var id = parseInt($(this).find('.quickedit-vn').attr('data-id'));
            if (!id) return;
            var units = {};
            header.forEach(function(unitName, i) {
                if (unitName) {
                    units[unitName] = parseInt($(this).find('td:eq('+i+')').text()) || 0;
                }
            }.bind(this));
            troops[id] = units;
        });
        return troops;
    });
}

// ─── Calcul du plan ───────────────────────────────────────────────────────────

function buildPlan(landingTime, unit, minUnits, sigilPct, attackType, myTroops) {
    var result    = [];
    var serverNow = getServerTime().getTime();
    var speed     = UNIT_SPEEDS[unit] || 10; // minutes/champ
    var sigilRatio = 1 + sigilPct / 100;

    myVillages.forEach(function(mine) {
        // Vérifie que ce village a assez d'unités
        var available = (myTroops[mine.id] && myTroops[mine.id][unit]) || 0;
        if (available < minUnits) return;

        targetVillages.forEach(function(tgt) {
            var dist     = calcDistance(mine.coord, tgt.coord);
            if (dist === 0) return;

            // Temps de trajet en ms
            var travelMs = dist * speed * 60 * 1000 / sigilRatio;
            var launchMs = landingTime.getTime() - travelMs;

            // Ignore les envois déjà passés
            if (launchMs <= serverNow) return;

            result.push({
                from:              mine,
                target:            tgt,
                distance:          dist,
                unit:              unit,
                unitAmount:        available,
                launchTime:        launchMs,
                fmtLaunch:         formatDateTime(new Date(launchMs)),
                attackType:        attackType,
            });
        });
    });

    // Trie par heure d'envoi croissante
    result.sort(function(a,b){ return a.launchTime - b.launchTime; });
    return result;
}

// ─── Construction de l'URL point de ralliement ────────────────────────────────

function buildRallyUrl(fromId, toCoord, unit, amount) {
    var parts  = toCoord.split('|');
    var sitter = game_data.player.sitter > 0 ? '&t='+game_data.player.id : '';
    return '/game.php?'+sitter+'&village='+fromId
        +'&screen=place&x='+parts[0]+'&y='+parts[1]
        +'&'+unit+'='+amount;
}

// ─── Rendu du tableau de résultats ───────────────────────────────────────────

function renderTable() {
    var serverNow = getServerTime().getTime();
    var $tbody    = $('#op-results-body');
    $tbody.empty();

    if (plan.length === 0) {
        $tbody.append('<tr><td colspan="7" style="text-align:center;padding:8px;">'
            + tt('noResults') + '</td></tr>');
        $('#op-count').text('0 ' + tt('attacks'));
        return;
    }

    $('#op-count').text(plan.length + ' ' + tt('attacks'));

    plan.forEach(function(row, idx) {
        var rallyUrl  = buildRallyUrl(row.from.id, row.target.coord, row.unit, row.unitAmount);
        var color     = TEMPLATE_COLORS[row.attackType] || '#555';
        var remaining = secondsToHms((row.launchTime - serverNow) / 1000);

        var tr = '<tr class="op-row '+(idx%2===0?'row_a':'row_b')+'" data-idx="'+idx+'">'
            +'<td style="text-align:center;">'
                +'<input type="checkbox" class="op-check" checked data-idx="'+idx+'"/>'
            +'</td>'
            +'<td>'
                +'<a href="'+game_data.link_base_pure+'info_village&id='+row.from.id+'" target="_blank">'
                    +row.from.name+' ('+row.from.coord+')'
                +'</a>'
            +'</td>'
            +'<td>'
                +'<a href="'+game_data.link_base_pure+'info_village&id='+row.target.id+'" target="_blank">'
                    +row.target.coord
                +'</a>'
            +'</td>'
            +'<td style="text-align:center;">'
                +'<img src="/graphic/unit/unit_'+row.unit+'.webp" style="vertical-align:middle;width:20px;height:20px;" />'
                +' '+row.unitAmount.toLocaleString('de')
            +'</td>'
            +'<td style="text-align:center;">'+parseFloat(row.distance).toFixed(2)+'</td>'
            +'<td style="text-align:center;font-weight:bold;">'+row.fmtLaunch+'</td>'
            +'<td style="text-align:center;">'
                +'<span class="op-timer" data-launchms="'+row.launchTime+'">'+remaining+'</span>'
            +'</td>'
            +'<td style="text-align:center;">'
                +'<a href="'+rallyUrl+'" target="_blank" class="btn btn-confirm-yes" '
                    +'style="background:'+color+';border-color:'+color+';color:#fff;padding:2px 8px;">'
                    +tt('send')
                +'</a>'
            +'</td>'
        +'</tr>';

        $tbody.append(tr);
    });

    // Lance le ticker des timers
    startTimerTick();
}

function startTimerTick() {
    clearInterval(window._opPlannerTick);
    window._opPlannerTick = setInterval(function() {
        var now = getServerTime().getTime();
        $('.op-timer').each(function() {
            var ms  = +$(this).data('launchms');
            var sec = (ms - now) / 1000;
            if (sec <= 0) {
                $(this).text('00:00:00').closest('tr').css('opacity','0.4');
            } else {
                $(this).text(secondsToHms(sec));
                // Alerte sonore à 10 secondes
                if (sec <= 10 && sec > 9) {
                    try { TribalWars.playSound('chat'); } catch(e) {}
                }
            }
        });
    }, 1000);
}

// ─── Export BB Code ───────────────────────────────────────────────────────────

function getBBCode() {
    var checked = getCheckedPlan();
    if (!checked.length) return '';

    var landingStr = $('#op-landing-time').val().trim();
    var bb = '[b]OP Planner — '+tt('title')+'[/b]\n';
    bb += '[b]'+tt('landingTime')+':[/b] '+landingStr+'\n\n';
    bb += '[table][**]'+tt('from')+'[||]'+tt('target')+'[||]'+tt('unit')+'[||]'+tt('launchTime')+'[||]'+tt('send')+'[/**]\n';

    checked.forEach(function(row) {
        var parts   = row.target.coord.split('|');
        var sitter  = game_data.player.sitter > 0 ? '&t='+game_data.player.id : '';
        var url     = window.location.origin+'/game.php?'+sitter+'&village='+row.from.id
            +'&screen=place&x='+parts[0]+'&y='+parts[1]+'&'+row.unit+'='+row.unitAmount;
        bb += '[*]'+row.from.name+' ('+row.from.coord+')'
            +'[|]'+row.target.coord
            +'[|][unit]'+row.unit+'[/unit] '+row.unitAmount.toLocaleString('de')
            +'[|]'+row.fmtLaunch
            +'[|][url='+url+']'+tt('send')+'[/url]\n';
    });

    bb += '[/table]';
    return bb;
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function getCSV() {
    var checked = getCheckedPlan();
    if (!checked.length) return '';

    var lines = [['From','FromCoord','Target','Unit','Amount','Distance','LaunchTime'].join(';')];
    checked.forEach(function(row) {
        lines.push([
            row.from.name, row.from.coord, row.target.coord,
            row.unit, row.unitAmount,
            row.distance.toFixed(2), row.fmtLaunch
        ].join(';'));
    });
    return lines.join('\n');
}

function getCheckedPlan() {
    var result = [];
    $('.op-check:checked').each(function() {
        var idx = +$(this).data('idx');
        if (plan[idx]) result.push(plan[idx]);
    });
    return result;
}

function copyToClipboard(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); UI.SuccessMessage(tt('copied')); }
    catch(e) {}
    document.body.removeChild(ta);
}

// ─── Interface ────────────────────────────────────────────────────────────────

function renderGroupSelect(groups, selectedId) {
    var html = '<select id="op-group" style="'+inputStyle()+'">';
    (groups.result || []).forEach(function(g) {
        if (g.type === 'separator') { html += '<option disabled/>'; return; }
        html += '<option value="'+g.group_id+'"'+(g.group_id==selectedId?' selected':'')+'>'+g.name+'</option>';
    });
    html += '</select>';
    return html;
}

function renderUnitSelector() {
    var units  = (game_data.units || ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob']);
    var skip   = ['spy','militia'];
    var stored = [];
    try { stored = JSON.parse(localStorage.getItem(LS_PREFIX+'_units')) || []; } catch(e) {}

    var html = '<table class="vis" style="width:100%;"><thead><tr>';
    units.forEach(function(u) {
        if (skip.indexOf(u) >= 0) return;
        html += '<th style="text-align:center;padding:2px;">'
            +'<label for="op_unit_'+u+'">'
            +'<img src="/graphic/unit/unit_'+u+'.webp" style="width:22px;height:22px;" title="'+u+'">'
            +'</label></th>';
    });
    html += '</tr></thead><tbody><tr>';
    units.forEach(function(u) {
        if (skip.indexOf(u) >= 0) return;
        var checked = stored.length === 0
            ? (u === 'axe' || u === 'light')   // défaut : hache et cavalerie légère
            : (stored.indexOf(u) >= 0);
        html += '<td style="text-align:center;padding:2px;">'
            +'<input type="radio" name="op_unit" id="op_unit_'+u+'" value="'+u+'"'+(checked?' checked':'')+'>'
            +'</td>';
    });
    html += '</tr></tbody></table>';
    return html;
}

function inputStyle() {
    return 'width:100%;padding:4px 8px;border:1px solid #603000;font-size:12px;background:#fffbe8;';
}

function buildUI(groups) {
    var savedGroup = localStorage.getItem(LS_PREFIX+'_group') || 0;
    var savedTime  = localStorage.getItem(LS_PREFIX+'_landing') || '';
    var savedSigil = localStorage.getItem(LS_PREFIX+'_sigil') || '0';
    var savedMin   = localStorage.getItem(LS_PREFIX+'_minUnits') || '1';
    var savedType  = localStorage.getItem(LS_PREFIX+'_attackType') || 'nuke';

    var groupSelect  = renderGroupSelect(groups, savedGroup);
    var unitSelector = renderUnitSelector();

    var attackTypes = ['nuke','off','fake','noble','snipe'];
    var typeOptions = attackTypes.map(function(t) {
        return '<option value="'+t+'"'+(t===savedType?' selected':'')+'>'+tt(t)+'</option>';
    }).join('');

    var html = '<div id="op-planner" style="'
        +'font-family:Verdana,sans-serif;font-size:11px;'
        +'background:#f4e4bc;border:1px solid #603000;'
        +'padding:12px;margin:0 0 16px;box-sizing:border-box;">'

        +'<h2 style="margin:0 0 10px;font-size:14px;color:#3d2b00;">'+tt('title')+'</h2>'

        // ── Ligne 1 : heure + type + sigil + min
        +'<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px;">'
            +'<div><label style="display:block;font-weight:bold;margin-bottom:3px;">'+tt('landingTime')+'</label>'
                +'<input id="op-landing-time" type="text" value="'+savedTime+'" style="'+inputStyle()+'"></div>'
            +'<div><label style="display:block;font-weight:bold;margin-bottom:3px;">'+tt('attackType')+'</label>'
                +'<select id="op-attack-type" style="'+inputStyle()+'">'+typeOptions+'</select></div>'
            +'<div><label style="display:block;font-weight:bold;margin-bottom:3px;">'+tt('sigil')+'</label>'
                +'<input id="op-sigil" type="text" value="'+savedSigil+'" style="'+inputStyle()+'"></div>'
            +'<div><label style="display:block;font-weight:bold;margin-bottom:3px;">'+tt('minUnits')+'</label>'
                +'<input id="op-min-units" type="text" value="'+savedMin+'" style="'+inputStyle()+'"></div>'
        +'</div>'

        // ── Ligne 2 : groupe + villages cibles sélectionnés
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
            +'<div><label style="display:block;font-weight:bold;margin-bottom:3px;">'+tt('myGroup')+'</label>'
                +groupSelect+'</div>'
            +'<div><label style="display:block;font-weight:bold;margin-bottom:3px;">'
                +tt('targetVillages')+' <span id="op-target-count" style="color:#8e44ad;">('+targetVillages.length+')</span>'
            +'</label>'
            +'<div style="max-height:60px;overflow-y:auto;border:1px solid #a0820a;padding:3px;background:#fffbe8;font-size:10px;" id="op-targets-preview">'
                +targetVillages.map(function(v){ return v.coord; }).join(', ')
            +'</div></div>'
        +'</div>'

        // ── Ligne 3 : sélecteur d'unité
        +'<div style="margin-bottom:10px;">'
            +'<label style="display:block;font-weight:bold;margin-bottom:4px;">'+tt('unit')+'</label>'
            +unitSelector
        +'</div>'

        // ── Boutons d'action
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">'
            +'<a href="#" id="op-calculate" class="btn btn-confirm-yes" style="padding:4px 12px;">'+tt('calculate')+'</a>'
            +'<a href="#" id="op-export-bb" class="btn" style="padding:4px 12px;">'+tt('exportBB')+'</a>'
            +'<a href="#" id="op-export-csv" class="btn" style="padding:4px 12px;">'+tt('exportCSV')+'</a>'
            +'<a href="#" id="op-select-all" class="btn" style="padding:4px 12px;">'+tt('selectAll')+'</a>'
            +'<a href="#" id="op-deselect-all" class="btn" style="padding:4px 12px;">'+tt('deselectAll')+'</a>'
        +'</div>'

        // ── Résultats
        +'<div id="op-results-wrap" style="display:none;">'
            +'<div style="margin-bottom:6px;font-weight:bold;color:#3d2b00;" id="op-count"></div>'
            +'<div style="overflow-x:auto;">'
            +'<table class="vis" style="width:100%;border-collapse:separate;border-spacing:2px;">'
                +'<thead><tr style="background:#c8a96e;">'
                    +'<th style="width:24px;"></th>'
                    +'<th style="text-align:left;padding:4px;">'+tt('from')+'</th>'
                    +'<th style="text-align:left;padding:4px;">'+tt('target')+'</th>'
                    +'<th style="text-align:center;padding:4px;">'+tt('unit')+'</th>'
                    +'<th style="text-align:center;padding:4px;">'+tt('distance')+'</th>'
                    +'<th style="text-align:center;padding:4px;">'+tt('launchTime')+'</th>'
                    +'<th style="text-align:center;padding:4px;">'+tt('sendIn')+'</th>'
                    +'<th style="text-align:center;padding:4px;">'+tt('send')+'</th>'
                +'</tr></thead>'
                +'<tbody id="op-results-body"></tbody>'
            +'</table>'
            +'</div>'
        +'</div>'

    +'</div>';

    // Injecte avant le contenu principal
    if ($('#op-planner').length === 0) {
        $('#contentContainer, #content_value').first().prepend(html);
    }

    bindEvents();
}

// ─── Événements ───────────────────────────────────────────────────────────────

function bindEvents() {

    // Calcul
    $('#op-calculate').off('click').on('click', function(e) {
        e.preventDefault();

        var landingStr = $('#op-landing-time').val().trim();
        var unit       = $('input[name="op_unit"]:checked').val();
        var minUnits   = parseInt($('#op-min-units').val()) || 1;
        var sigilPct   = parseFloat($('#op-sigil').val()) || 0;
        var attackType = $('#op-attack-type').val();
        var groupId    = $('#op-group').val();

        // Sauvegarde des préférences
        localStorage.setItem(LS_PREFIX+'_landing',     landingStr);
        localStorage.setItem(LS_PREFIX+'_group',       groupId);
        localStorage.setItem(LS_PREFIX+'_sigil',       sigilPct);
        localStorage.setItem(LS_PREFIX+'_minUnits',    minUnits);
        localStorage.setItem(LS_PREFIX+'_attackType',  attackType);
        localStorage.setItem(LS_PREFIX+'_units',       JSON.stringify([unit]));

        if (!landingStr || !unit) return;

        var landingTime = parseLandingTime(landingStr);

        // Récupère les troupes puis calcule
        fetchMyTroops(groupId).then(function(troops) {
            myTroops = troops;
            plan = buildPlan(landingTime, unit, minUnits, sigilPct, attackType, troops);
            $('#op-results-wrap').show();
            renderTable();
        }).fail(function() {
            UI.ErrorMessage(tt('fetchError'));
        });
    });

    // Export BB
    $('#op-export-bb').off('click').on('click', function(e) {
        e.preventDefault();
        var bb = getBBCode();
        if (!bb) { UI.ErrorMessage(tt('nothingToExport')); return; }
        var content = '<div style="width:400px;">'
            +'<label style="font-weight:bold;display:block;margin-bottom:5px;">BB Code</label>'
            +'<textarea id="op-bb-ta" readonly style="width:100%;height:120px;resize:none;">'+bb+'</textarea>'
            +'</div>';
        Dialog.show('op_bb', content);
        setTimeout(function(){ $('#op-bb-ta').select(); document.execCommand('copy'); UI.SuccessMessage(tt('copied')); }, 100);
    });

    // Export CSV
    $('#op-export-csv').off('click').on('click', function(e) {
        e.preventDefault();
        var csv = getCSV();
        if (!csv) { UI.ErrorMessage(tt('nothingToExport')); return; }
        copyToClipboard(csv);
    });

    // Tout sélectionner / désélectionner
    $('#op-select-all').off('click').on('click', function(e) {
        e.preventDefault();
        $('.op-check').prop('checked', true);
    });
    $('#op-deselect-all').off('click').on('click', function(e) {
        e.preventDefault();
        $('.op-check').prop('checked', false);
    });

    // Changement de groupe → recharge mes villages
    $('#op-group').off('change').on('change', function() {
        var gid = $(this).val();
        fetchMyVillages(gid).then(function(list) {
            myVillages = list;
        });
    });
}

(function() {

    if (!game_data.features.Premium.active) {
        UI.ErrorMessage(tt('premium'));
        return;
    }

    var screen = new URL(window.location.href).searchParams.get('screen');

    if (screen !== 'info_player') {
        UI.ErrorMessage(tt('wrongScreen'), 5000);
        return;
    }

    var targetPlayerId = new URL(window.location.href).searchParams.get('id');
    if (targetPlayerId && +targetPlayerId === +game_data.player.id) {
        UI.ErrorMessage('Exécutez ce script depuis le profil d\'un joueur adverse, pas le vôtre.', 5000);
        return;
    }

    $.when(
        loadUnitInfo(),
        fetchGroups()
    ).then(function() {
        var groupData = arguments[1][0];

        targetVillages = fetchTargetVillages();

        if (targetVillages.length === 0) {
            UI.ErrorMessage('Aucun village trouvé sur ce profil.', 4000);
            return;
        }

        var savedGroup = localStorage.getItem(LS_PREFIX+'_group') || 0;

        fetchMyVillages(savedGroup).then(function(list) {
            myVillages = list;
            buildUI(groupData);
        }).fail(function() {
            UI.ErrorMessage(tt('fetchError'));
        });
    });

})();
