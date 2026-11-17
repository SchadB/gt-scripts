/*
 * Script Name: OP Planner
 * Version: v2.1
 * Last Updated: 2026-11-17
 * Author: Schadrac
 * Author URL: https://schadb.github.io/gt-scripts/
 * Screen: info_player
 */

if (typeof DEBUG !== 'boolean') DEBUG = false;

var scriptData = {
    prefix:    'opPlanner',
    name:      'OP Planner',
    version:   'v2.1',
    author:    'Schadrac',
    authorUrl: 'https://schadb.github.io/gt-scripts/',
};

var LS_PREFIX = 'schadrac_opPlanner';

var UNIT_SPEEDS = {};
var UNIT_INFO   = {};

var myVillages     = [];
var targetVillages = [];
var plan           = [];

// ─── Traductions ──────────────────────────────────────────────────────────────
var translations = {
    fr_FR: {
        title:           'OP Planner — Planificateur d\'opération',
        landingTime:     'Heure d\'arrivée (jj/mm/aaaa HH:mm:ss)',
        unit:            'Unité de référence (vitesse)',
        sigil:           'Bonus vitesse (%)',
        myGroup:         'Mes villages (groupe)',
        targetVillages:  'Villages cibles',
        calculate:       'Calculer les envois',
        exportBB:        'Exporter BB Code',
        exportCSV:       'Exporter CSV',
        selectAll:       'Tout sélectionner',
        deselectAll:     'Tout désélectionner',
        from:            'Depuis',
        target:          'Cible',
        distance:        'Distance',
        launchTime:      'Heure d\'envoi',
        sendIn:          'Envoi dans',
        send:            'Envoyer',
        noResults:       'Aucun envoi possible. Vérifiez l\'heure d\'arrivée.',
        wrongScreen:     'Ce script doit être exécuté depuis le profil d\'un joueur (page info_player).',
        ownProfile:      'Exécutez ce script depuis le profil d\'un joueur adverse, pas le vôtre.',
        noTargets:       'Aucun village trouvé sur ce profil.',
        fetchError:      'Erreur lors de la récupération des données.',
        copied:          'Copié !',
        nothingToExport: 'Rien à exporter.',
        attacks:         'attaque(s) planifiée(s)',
        surplusNote:     'village(s) en surplus (cibles aléatoires)',
        premium:         'Ce script nécessite un compte Premium.',
        pastTime:        'L\'heure d\'arrivée est déjà passée.',
        loading:         'Chargement...',
        resetGroup:      'Réinitialiser groupe',
        groupReset:      'Groupe réinitialisé !',
        invalidDate:     'Format de date invalide. Exemple : 17/11/2026 22:00:00',
    },
    en_DK: {
        title:           'OP Planner — Operation Planner',
        landingTime:     'Landing Time (dd/mm/yyyy HH:mm:ss)',
        unit:            'Reference unit (speed)',
        sigil:           'Speed bonus (%)',
        myGroup:         'My village group',
        targetVillages:  'Target villages',
        calculate:       'Calculate launch times',
        exportBB:        'Export BB Code',
        exportCSV:       'Export CSV',
        selectAll:       'Select all',
        deselectAll:     'Deselect all',
        from:            'From',
        target:          'Target',
        distance:        'Distance',
        launchTime:      'Launch Time',
        sendIn:          'Send in',
        send:            'Send',
        noResults:       'No attacks plannable. Check landing time.',
        wrongScreen:     'This script must be run from a player\'s profile page (info_player screen).',
        ownProfile:      'Run this script from an enemy player\'s profile, not your own.',
        noTargets:       'No villages found on this player\'s profile.',
        fetchError:      'Error fetching data.',
        copied:          'Copied!',
        nothingToExport: 'Nothing to export.',
        attacks:         'attack(s) planned',
        surplusNote:     'surplus village(s) (random targets)',
        premium:         'This script requires a Premium account.',
        pastTime:        'Landing time is already in the past.',
        loading:         'Loading...',
        resetGroup:      'Reset group',
        groupReset:      'Group reset!',
        invalidDate:     'Invalid date format. Example: 17/11/2026 22:00:00',
    },
    de_DE: {
        title:           'OP Planner — Operationsplaner',
        landingTime:     'Ankunftszeit (TT/MM/JJJJ HH:mm:ss)',
        unit:            'Referenzeinheit',
        sigil:           'Geschwindigkeitsbonus (%)',
        myGroup:         'Meine Dorfgruppe',
        targetVillages:  'Zieldörfer',
        calculate:       'Abschickzeiten berechnen',
        exportBB:        'Als BB Code exportieren',
        exportCSV:       'Als CSV exportieren',
        selectAll:       'Alle auswählen',
        deselectAll:     'Alle abwählen',
        from:            'Von',
        target:          'Ziel',
        distance:        'Entfernung',
        launchTime:      'Abschickzeit',
        sendIn:          'Abschicken in',
        send:            'Senden',
        noResults:       'Kein Abschicken möglich. Ankunftszeit prüfen.',
        wrongScreen:     'Dieses Skript muss vom Spielerprofil gestartet werden.',
        ownProfile:      'Starte dieses Skript vom feindlichen Profil, nicht von deinem eigenen.',
        noTargets:       'Keine Dörfer auf diesem Profil gefunden.',
        fetchError:      'Fehler beim Abrufen der Daten.',
        copied:          'Kopiert!',
        nothingToExport: 'Nichts zu exportieren.',
        attacks:         'Angriff(e) geplant',
        surplusNote:     'Überschussdorf/-dörfer (zufällige Ziele)',
        premium:         'Dieses Skript benötigt einen Premium-Account.',
        pastTime:        'Ankunftszeit liegt in der Vergangenheit.',
        loading:         'Laden...',
        resetGroup:      'Gruppe zurücksetzen',
        groupReset:      'Gruppe zurückgesetzt!',
        invalidDate:     'Ungültiges Datum. Beispiel: 17/11/2026 22:00:00',
    },
    pt_BR: {
        title:           'OP Planner — Planejador de Operação',
        landingTime:     'Hora de chegada (dd/mm/aaaa HH:mm:ss)',
        unit:            'Unidade de referência',
        sigil:           'Bônus de velocidade (%)',
        myGroup:         'Grupo de aldeias',
        targetVillages:  'Aldeias alvo',
        calculate:       'Calcular horários',
        exportBB:        'Exportar BB Code',
        exportCSV:       'Exportar CSV',
        selectAll:       'Selecionar tudo',
        deselectAll:     'Desmarcar tudo',
        from:            'De',
        target:          'Alvo',
        distance:        'Distância',
        launchTime:      'Hora de envio',
        sendIn:          'Enviar em',
        send:            'Enviar',
        noResults:       'Nenhum envio calculável. Verifique a hora de chegada.',
        wrongScreen:     'Este script deve ser executado a partir do perfil de um jogador.',
        ownProfile:      'Execute a partir do perfil de um jogador inimigo, não do seu.',
        noTargets:       'Nenhuma aldeia encontrada neste perfil.',
        fetchError:      'Erro ao buscar dados.',
        copied:          'Copiado!',
        nothingToExport: 'Nada para exportar.',
        attacks:         'ataque(s) planejado(s)',
        surplusNote:     'aldeia(s) em excesso (alvos aleatórios)',
        premium:         'Este script requer uma conta Premium.',
        pastTime:        'A hora de chegada já passou.',
        loading:         'Carregando...',
        resetGroup:      'Resetar grupo',
        groupReset:      'Grupo resetado!',
        invalidDate:     'Formato de data inválido. Exemplo: 17/11/2026 22:00:00',
    },
};

function tt(key) {
    var locale = translations[game_data.locale] ? game_data.locale : 'en_DK';
    return translations[locale][key] || translations['en_DK'][key] || key;
}

// ─── Temps ────────────────────────────────────────────────────────────────────

function getServerTime() {
    var t = $('#serverTime').text().trim();
    var d = $('#serverDate').text().trim().split('/');
    var parts = t.split(':');
    return new Date(+d[2], +d[1]-1, +d[0], +parts[0], +parts[1], +parts[2]);
}

// Accepte jj/mm/aaaa HH:mm[:ss[:mmm]] (séparateurs / . -). Renvoie une Date invalide sinon.
function parseLandingTime(str) {
    var m = String(str || '').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[:.](\d{1,3}))?)?$/);
    if (!m) return new Date(NaN);
    var d = new Date(+m[3], +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0), +(m[6]||0), +(m[7]||0));
    // Rejette les dates « débordantes » (ex. 31/02 → 03/03)
    if (d.getDate() !== +m[1] || d.getMonth() !== +m[2]-1 || +(m[4]||0) > 23 || +(m[6]||0) > 59) return new Date(NaN);
    return d;
}

function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
        return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
}

// Durée de trajet en ms, arrondie à la seconde comme le fait le jeu.
function travelMsFor(dist, speed, sigilRatio) {
    return Math.round(dist * speed * 60 / sigilRatio) * 1000;
}

function formatDateTime(date) {
    var pad = function(n){ return ('0'+n).slice(-2); };
    return pad(date.getDate())+'/'+pad(date.getMonth()+1)+'/'+date.getFullYear()
        +' '+pad(date.getHours())+':'+pad(date.getMinutes())+':'+pad(date.getSeconds());
}

function secondsToHms(sec) {
    sec = Math.max(0, Math.floor(sec));
    return ('0'+Math.floor(sec/3600)).slice(-2)+':'+('0'+Math.floor((sec%3600)/60)).slice(-2)+':'+('0'+(sec%60)).slice(-2);
}

function calcDistance(c1, c2) {
    var a = c1.split('|'), b = c2.split('|');
    return Math.sqrt(Math.pow(+a[0]-+b[0],2) + Math.pow(+a[1]-+b[1],2));
}

// ─── Données ──────────────────────────────────────────────────────────────────

function fetchUnitInfo() {
    return $.ajax({ url: '/interface.php?func=get_unit_info', dataType: 'xml' }).then(function(xml) {
        $(xml).find('config').children().each(function() {
            var speed = parseFloat($(this).find('speed').text());
            if (!isNaN(speed)) UNIT_SPEEDS[$(this).prop('nodeName')] = speed;
        });
        localStorage.setItem(LS_PREFIX+'_unitSpeeds', JSON.stringify({ data: UNIT_SPEEDS, ts: Date.now() }));
        UNIT_INFO = UNIT_SPEEDS;
    });
}

function loadUnitInfo() {
    var stored = localStorage.getItem(LS_PREFIX+'_unitSpeeds');
    if (stored) {
        try {
            var c = JSON.parse(stored);
            if (c.ts && (Date.now() - c.ts) < 86400000) {
                UNIT_SPEEDS = c.data || c;
                UNIT_INFO   = UNIT_SPEEDS;
                return $.Deferred().resolve().promise();
            }
        } catch(e) {}
    }
    return fetchUnitInfo();
}

function fetchTargetVillages() {
    var villages = [];

    $('#villages_list tr, #player_villages tr').each(function() {
        var $link = $(this).find('a[href*="info_village"]');
        if (!$link.length) return;
        var href    = $link.attr('href') || '';
        var idMatch = href.match(/id=(\d+)/);
        if (!idMatch) return;
        var coord = ($link.text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0]
                 || ($(this).find('td').eq(1).text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0];
        if (!coord) return;
        var id = +idMatch[1];
        if (!villages.some(function(v){ return v.id === id; }))
            villages.push({ id: id, coord: coord });
    });

    if (villages.length === 0) {
        $('#content_value a[href*="info_village"], #contentContainer a[href*="info_village"]').each(function() {
            var href    = $(this).attr('href') || '';
            var idMatch = href.match(/id=(\d+)/);
            if (!idMatch) return;
            var coord = ($(this).text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0];
            if (!coord) return;
            var id = +idMatch[1];
            if (!villages.some(function(v){ return v.id === id; }))
                villages.push({ id: id, coord: coord });
        });
    }
    return villages;
}

function fetchMyVillages(groupId) {
    var url = game_data.link_base_pure + 'groups&ajax=load_villages_from_group';
    if (game_data.player.sitter > 0) url += '&t='+game_data.player.id;

    return $.ajax({
        method:   'POST',
        url:      url,
        data:     { group_id: groupId },
        dataType: 'json',
        headers:  { 'TribalWars-Ajax': 1 }
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

// ─── Algorithme 1-pour-1 ─────────────────────────────────────────────────────
// Chaque village cible reçoit UN village attaquant (le plus proche disponible).
// Les villages en surplus reçoivent une cible aléatoire.

function buildPlan(landingTime, unit, sigilPct) {
    var serverNow  = getServerTime().getTime();
    var speed      = UNIT_SPEEDS[unit] || 10;
    var sigilRatio = 1 + sigilPct / 100;
    var landingMs  = landingTime.getTime();

    if (landingMs <= serverNow) {
        UI.ErrorMessage(tt('pastTime'), 4000);
        return [];
    }

    var available = myVillages.slice();
    var assigned  = [];

    function launchFor(mine, tgt) {
        var dist = calcDistance(mine.coord, tgt.coord);
        return { dist: dist, launchMs: landingMs - travelMsFor(dist, speed, sigilRatio) };
    }

    // Phase 1 : matching glouton — cible → village le plus proche QUI PEUT ENCORE ARRIVER À TEMPS.
    // Un village trop loin n'est pas « consommé » : il reste disponible pour le surplus.
    targetVillages.forEach(function(tgt) {
        var bestIdx = -1, best = null;
        for (var i = 0; i < available.length; i++) {
            var c = launchFor(available[i], tgt);
            if (c.launchMs <= serverNow) continue;
            if (!best || c.dist < best.dist) { best = c; bestIdx = i; }
        }
        if (bestIdx < 0) return;
        var mine = available.splice(bestIdx, 1)[0];
        assigned.push({ from: mine, target: tgt, dist: best.dist, launchMs: best.launchMs, extra: false });
    });

    // Phase 2 : villages en surplus → cible aléatoire parmi celles qu'ils peuvent atteindre à temps
    available.forEach(function(mine) {
        var reachable = targetVillages.filter(function(t) { return launchFor(mine, t).launchMs > serverNow; });
        if (!reachable.length) return;
        var rnd = reachable[Math.floor(Math.random() * reachable.length)];
        var c   = launchFor(mine, rnd);
        assigned.push({ from: mine, target: rnd, dist: c.dist, launchMs: c.launchMs, extra: true });
    });

    assigned.sort(function(a, b){ return a.launchMs - b.launchMs; });
    return assigned;
}

// ─── Affichage ────────────────────────────────────────────────────────────────

function renderTable() {
    var serverNow = getServerTime().getTime();
    var $tbody    = $('#op-results-body');
    $tbody.empty();

    if (plan.length === 0) {
        $tbody.append('<tr><td colspan="7" style="text-align:center;padding:8px;">'+tt('noResults')+'</td></tr>');
        $('#op-count').text('0 '+tt('attacks'));
        return;
    }

    var primary = plan.filter(function(r){ return !r.extra; });
    var extra   = plan.filter(function(r){ return r.extra; });
    var txt = primary.length+' '+tt('attacks');
    if (extra.length) txt += ' + '+extra.length+' '+tt('surplusNote');
    $('#op-count').text(txt);

    plan.forEach(function(row, idx) {
        var parts    = row.target.coord.split('|');
        var sitter   = game_data.player.sitter > 0 ? 't='+game_data.player.id+'&' : '';
        var rallyUrl = '/game.php?'+sitter+'village='+row.from.id+'&screen=place&x='+parts[0]+'&y='+parts[1];
        var rem      = secondsToHms((row.launchMs - serverNow) / 1000);
        var rowBg    = idx%2===0 ? '#fff5da' : '#f0e2be';
        var extraTag = row.extra ? ' <span style="font-size:9px;background:#7f8c8d;color:#fff;padding:1px 3px;border-radius:2px;">surplus</span>' : '';

        $tbody.append(
            '<tr style="background-color:'+rowBg+';">'
            +'<td style="padding:4px;text-align:center;"><input type="checkbox" class="op-check" checked data-idx="'+idx+'"/></td>'
            +'<td style="padding:4px;"><a href="'+game_data.link_base_pure+'info_village&id='+row.from.id+'" target="_blank">'+escapeHtml(row.from.name)+' ('+row.from.coord+')</a>'+extraTag+'</td>'
            +'<td style="padding:4px;text-align:center;"><a href="'+game_data.link_base_pure+'info_village&id='+row.target.id+'" target="_blank">'+row.target.coord+'</a></td>'
            +'<td style="padding:4px;text-align:center;">'+row.dist.toFixed(2)+'</td>'
            +'<td style="padding:4px;text-align:center;font-weight:600;">'+formatDateTime(new Date(row.launchMs))+'</td>'
            +'<td style="padding:4px;text-align:center;"><span class="op-timer" data-launchms="'+row.launchMs+'">'+rem+'</span></td>'
            +'<td style="padding:4px;text-align:center;"><a href="'+rallyUrl+'" target="_blank" class="btn btn-confirm-yes" style="padding:2px 8px;">'+tt('send')+'</a></td>'
            +'</tr>'
        );
    });

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
                if (sec <= 10 && sec > 9) { try { TribalWars.playSound('chat'); } catch(e) {} }
            }
        });
    }, 1000);
}

// ─── Export ───────────────────────────────────────────────────────────────────

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
    try { document.execCommand('copy'); UI.SuccessMessage(tt('copied')); } catch(e) {}
    document.body.removeChild(ta);
}

function getBBCode() {
    var checked = getCheckedPlan();
    if (!checked.length) return '';
    var landingStr = $('#op-landing-time').val().trim();
    var bb = '[b]OP Planner[/b]\n[b]'+tt('landingTime')+':[/b] '+landingStr+'\n\n';
    bb += '[table][**]'+tt('from')+'[||]'+tt('target')+'[||]'+tt('distance')+'[||]'+tt('launchTime')+'[||]'+tt('send')+'[/**]\n';
    checked.forEach(function(row) {
        var parts  = row.target.coord.split('|');
        var sitter = game_data.player.sitter > 0 ? 't='+game_data.player.id+'&' : '';
        var url    = window.location.origin+'/game.php?'+sitter+'village='+row.from.id+'&screen=place&x='+parts[0]+'&y='+parts[1];
        bb += '[*]'+row.from.name+' ('+row.from.coord+')[|]'+row.target.coord+'[|]'+row.dist.toFixed(2)+'[|]'+formatDateTime(new Date(row.launchMs))+'[|][url='+url+']'+tt('send')+'[/url]\n';
    });
    bb += '[/table]';
    return bb;
}

function getCSV() {
    var checked = getCheckedPlan();
    if (!checked.length) return '';
    var lines = [['From','FromCoord','Target','Distance','LaunchTime'].join(';')];
    checked.forEach(function(row) {
        lines.push([row.from.name, row.from.coord, row.target.coord, row.dist.toFixed(2), formatDateTime(new Date(row.launchMs))].join(';'));
    });
    return lines.join('\n');
}

// ─── Interface ────────────────────────────────────────────────────────────────

function renderGroupSelect(groups, selectedId) {
    var html = '<select id="op-group" style="width:100%;padding:5px 10px;border:1px solid #000;font-size:16px;">';
    (groups.result || []).forEach(function(g) {
        if (g.type === 'separator') { html += '<option disabled/>'; return; }
        html += '<option value="'+g.group_id+'"'+(g.group_id==selectedId?' selected':'')+'>'+escapeHtml(g.name)+'</option>';
    });
    html += '</select>';
    return html;
}

function renderUnitSelector() {
    var units = game_data.units || ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
    var skip  = ['spy','militia'];
    var saved = localStorage.getItem(LS_PREFIX+'_unit') || 'axe';
    var th = '', td = '';
    units.forEach(function(u) {
        if (skip.indexOf(u) >= 0) return;
        th += '<th style="text-align:center;padding:2px;"><label for="op_unit_'+u+'"><img src="/graphic/unit/unit_'+u+'.png" style="width:22px;height:22px;cursor:pointer;" title="'+u+'"></label></th>';
        td += '<td style="text-align:center;padding:2px;"><input type="radio" name="op_unit" id="op_unit_'+u+'" value="'+u+'"'+(u===saved?' checked':'')+'></td>';
    });
    return '<table class="vis" width="100%"><thead><tr>'+th+'</tr></thead><tbody><tr>'+td+'</tr></tbody></table>';
}

function buildUI(groups) {
    var savedGroup = localStorage.getItem(LS_PREFIX+'_group') || 0;
    var savedSigil = localStorage.getItem(LS_PREFIX+'_sigil') || '0';
    var serverNow  = formatDateTime(getServerTime());

    var html = '<div class="ra-op-planner" id="opPlannerBlock">'
        + '<h2>'+tt('title')+'</h2>'
        + '<div class="ra-mb15"><div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:0 20px;">'
            + '<div><label>'+tt('landingTime')+'</label><input id="op-landing-time" type="text" value="'+serverNow+'"></div>'
            + '<div><label>'+tt('sigil')+'</label><input id="op-sigil" type="text" value="'+escapeHtml(savedSigil)+'"></div>'
            + '<div><label>'+tt('myGroup')+'</label>'+renderGroupSelect(groups, savedGroup)+'</div>'
        + '</div></div>'
        + '<div class="ra-mb15"><label>'+tt('unit')+'</label>'+renderUnitSelector()+'</div>'
        + '<div class="ra-mb15" style="font-size:11px;">'
            + '<span id="op-info-mine" style="color:#603000;"></span>'
            + ' &nbsp;|&nbsp; '
            + '<span id="op-info-targets" style="color:#603000;">'+targetVillages.length+' '+tt('targetVillages')+'</span>'
        + '</div>'
        + '<div class="ra-mb15">'
            + '<a href="javascript:void(0);" id="op-calculate" class="btn btn-confirm-yes">'+tt('calculate')+'</a>'
            + ' <a href="javascript:void(0);" id="op-export-bb" class="btn">'+tt('exportBB')+'</a>'
            + ' <a href="javascript:void(0);" id="op-export-csv" class="btn">'+tt('exportCSV')+'</a>'
            + ' <a href="javascript:void(0);" id="op-select-all" class="btn">'+tt('selectAll')+'</a>'
            + ' <a href="javascript:void(0);" id="op-deselect-all" class="btn">'+tt('deselectAll')+'</a>'
            + ' <a href="javascript:void(0);" id="op-reset-group" class="btn">'+tt('resetGroup')+'</a>'
        + '</div>'
        + '<div id="op-results-wrap" style="display:none;">'
            + '<div id="op-count" style="font-weight:bold;margin-bottom:6px;"></div>'
            + '<div style="overflow-x:auto;max-height:420px;overflow-y:auto;">'
            + '<table class="ra-table" width="100%">'
                + '<thead><tr>'
                    + '<th style="width:20px;"></th>'
                    + '<th style="text-align:left;">'+tt('from')+'</th>'
                    + '<th>'+tt('target')+'</th>'
                    + '<th>'+tt('distance')+'</th>'
                    + '<th>'+tt('launchTime')+'</th>'
                    + '<th>'+tt('sendIn')+'</th>'
                    + '<th>'+tt('send')+'</th>'
                + '</tr></thead>'
                + '<tbody id="op-results-body"></tbody>'
            + '</table></div>'
        + '</div>'
        + '</div>'
        + '<style>'
        + '.ra-op-planner{position:relative;display:block;width:auto;clear:both;margin:0 auto 15px;padding:10px;border:1px solid #603000;box-sizing:border-box;background:#f4e4bc;}'
        + '.ra-op-planner *{box-sizing:border-box;}'
        + '.ra-op-planner h2{margin:0 0 10px;font-size:14px;}'
        + '.ra-op-planner label{font-weight:600!important;margin-bottom:5px;display:block;}'
        + '.ra-op-planner input[type="text"],.ra-op-planner select{width:100%;padding:5px 10px;border:1px solid #000;font-size:16px;}'
        + '.ra-op-planner .btn{padding:3px 4px;}'
        + '.ra-mb15{margin-bottom:15px;}'
        + '.ra-table{border-collapse:separate!important;border-spacing:2px!important;}'
        + '.ra-table th{font-size:13px;padding:5px;background:#c8a96e;}'
        + '.ra-table td{padding:5px;text-align:center;}'
        + '.ra-table tr:nth-of-type(2n) td{background-color:#f0e2be;}'
        + '.ra-table tr:nth-of-type(2n+1) td{background-color:#fff5da;}'
        + '</style>';

    if ($('#opPlannerBlock').length === 0)
        $('#contentContainer, #content_value').first().prepend(html);

    $('#op-info-mine').text(myVillages.length+' '+tt('myGroup'));
    bindEvents();
}

// ─── Événements ───────────────────────────────────────────────────────────────

function bindEvents() {
    $('#op-calculate').off('click').on('click', function(e) {
        e.preventDefault();
        var landStr  = $('#op-landing-time').val().trim();
        var unit     = $('input[name="op_unit"]:checked').val();
        var sigilPct = parseFloat($('#op-sigil').val()) || 0;
        var groupId  = $('#op-group').val();
        if (!landStr || !unit) return;
        localStorage.setItem(LS_PREFIX+'_unit',  unit);
        localStorage.setItem(LS_PREFIX+'_sigil', sigilPct);
        localStorage.setItem(LS_PREFIX+'_group', groupId);
        var landing = parseLandingTime(landStr);
        if (isNaN(landing.getTime())) {
            UI.ErrorMessage(tt('invalidDate'), 4000);
            return;
        }
        var $btn = $(this);
        if ($btn.data('busy')) return;              // évite les doubles clics (un <a> ignore « disabled »)
        $btn.data('busy', true).text(tt('loading'));
        fetchMyVillages(groupId).then(function(list) {
            myVillages = list;
            $('#op-info-mine').text(myVillages.length+' '+tt('myGroup'));
            plan = buildPlan(landing, unit, sigilPct);
            $('#op-results-wrap').show();
            renderTable();
        }).fail(function() {
            UI.ErrorMessage(tt('fetchError'));
        }).always(function() {
            $btn.data('busy', false).text(tt('calculate'));
        });
    });

    $('#op-landing-time').off('keydown').on('keydown', function(e) {
        if (e.which === 13) $('#op-calculate').trigger('click');
    });

    $('#op-export-bb').off('click').on('click', function(e) {
        e.preventDefault();
        var bb = getBBCode();
        if (!bb) { UI.ErrorMessage(tt('nothingToExport')); return; }
        Dialog.show('op_bb', '<div style="width:400px;"><textarea id="op-bb-ta" readonly style="width:100%;height:120px;resize:none;">'+escapeHtml(bb)+'</textarea></div>');
        setTimeout(function(){ $('#op-bb-ta').select(); document.execCommand('copy'); UI.SuccessMessage(tt('copied')); }, 100);
    });

    $('#op-export-csv').off('click').on('click', function(e) {
        e.preventDefault();
        var csv = getCSV();
        if (!csv) { UI.ErrorMessage(tt('nothingToExport')); return; }
        copyToClipboard(csv);
    });

    $('#op-select-all').off('click').on('click', function(e) {
        e.preventDefault(); $('.op-check').prop('checked', true);
    });
    $('#op-deselect-all').off('click').on('click', function(e) {
        e.preventDefault(); $('.op-check').prop('checked', false);
    });

    $('#op-reset-group').off('click').on('click', function(e) {
        e.preventDefault();
        localStorage.removeItem(LS_PREFIX+'_group');
        $('#op-group').val(0);
        fetchMyVillages(0).then(function(list) {
            myVillages = list;
            $('#op-info-mine').text(myVillages.length+' '+tt('myGroup'));
            UI.SuccessMessage(tt('groupReset'));
        });
    });

    $('#op-group').off('change').on('change', function() {
        fetchMyVillages($(this).val()).then(function(list) {
            myVillages = list;
            $('#op-info-mine').text(myVillages.length+' '+tt('myGroup'));
        });
    });
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

(function() {
    if (!game_data.features.Premium.active) {
        UI.ErrorMessage(tt('premium'));
        return;
    }

    var params   = new URL(window.location.href).searchParams;
    var screen   = params.get('screen');
    var targetId = params.get('id');

    if (screen !== 'info_player') {
        UI.ErrorMessage(tt('wrongScreen'), 5000);
        return;
    }
    if (targetId && +targetId === +game_data.player.id) {
        UI.ErrorMessage(tt('ownProfile'), 5000);
        return;
    }

    $.when(loadUnitInfo(), fetchGroups()).then(function() {
        var groupData = arguments[1][0];
        targetVillages = fetchTargetVillages();
        if (targetVillages.length === 0) {
            UI.ErrorMessage(tt('noTargets'), 5000);
            return;
        }
        var savedGroup = localStorage.getItem(LS_PREFIX+'_group') || 0;
        fetchMyVillages(savedGroup).then(function(list) {
            myVillages = list;
            buildUI(groupData);
        }).fail(function() { UI.ErrorMessage(tt('fetchError')); });
    }, function() { UI.ErrorMessage(tt('fetchError')); });
})();
