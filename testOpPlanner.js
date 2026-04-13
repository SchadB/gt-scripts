/*
 * Script Name: OP Planner
 * Version: v1.1.0
 * Last Updated: 2025-04-13
 * Author: Schadrac
 * Author URL: https://schadb.github.io/gt-scripts/
 * Author Contact: schadb (Discord)
 * Approved: N/A
 * Screen: info_player
 */

/* Copyright (c) Schadrac
By uploading a user-generated mod (script) for use with Tribal Wars, you grant InnoGames a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use, reproduce, distribute, publicly display, modify, and create derivative works of the mod. This license permits InnoGames to incorporate the mod into any aspect of the game and its related services, including promotional and commercial endeavors, without any requirement for compensation or attribution to you. You represent and warrant that you have the legal right to grant this license and that the mod does not infringe upon any third-party rights. German law applies.
*/

if (typeof DEBUG !== 'boolean') DEBUG = false;

var scriptData = {
    prefix:    'opPlanner',
    name:      'OP Planner',
    version:   'v1.1.0',
    author:    'Schadrac',
    authorUrl: 'https://schadb.github.io/gt-scripts/',
    helpLink:  'https://schadb.github.io/gt-scripts/',
};

var LS_PREFIX = 'schadrac_opPlanner';

var UNIT_SPEEDS = {};
var UNIT_INFO   = {};

var myVillages     = [];
var targetVillages = [];
var plan           = [];

var translations = {
    fr_FR: {
        title:           'OP Planner — Planificateur d\'opération',
        landingTime:     'Heure d\'arrivée (jj/mm/aaaa HH:mm:ss)',
        unit:            'Unité de référence',
        sigil:           'Bonus vitesse (%)',
        myGroup:         'Groupe de mes villages',
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
        noResults:       'Aucun envoi calculable. Vérifiez l\'heure d\'arrivée.',
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
    },
    en_DK: {
        title:           'OP Planner — Operation Planner',
        landingTime:     'Landing Time (dd/mm/yyyy HH:mm:ss)',
        unit:            'Reference unit',
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
        noResults:       'No launches calculable. Check the landing time.',
        wrongScreen:     'This script must be run from a player profile (info_player screen).',
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
        wrongScreen:     'Dieses Skript muss vom Spielerprofil aus gestartet werden.',
        ownProfile:      'Starte dieses Skript vom feindlichen Profil, nicht von deinem eigenen.',
        noTargets:       'Keine Dörfer auf diesem Spielerprofil gefunden.',
        fetchError:      'Fehler beim Abrufen der Daten.',
        copied:          'In Zwischenablage kopiert!',
        nothingToExport: 'Nichts zu exportieren.',
        attacks:         'Angriff(e) geplant',
        surplusNote:     'Überschussdorf/-dörfer (zufällige Ziele)',
        premium:         'Dieses Skript benötigt einen Premium-Account.',
        pastTime:        'Ankunftszeit liegt in der Vergangenheit.',
        loading:         'Laden...',
        resetGroup:      'Gruppe zurücksetzen',
        groupReset:      'Gruppe zurückgesetzt!',
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
        ownProfile:      'Execute este script a partir do perfil de um jogador inimigo, não do seu.',
        noTargets:       'Nenhuma aldeia encontrada no perfil deste jogador.',
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
    },
    it_IT: {
        title:           'OP Planner — Pianificatore di Operazione',
        landingTime:     'Ora di arrivo (gg/mm/aaaa HH:mm:ss)',
        unit:            'Unità di riferimento',
        sigil:           'Bonus velocità (%)',
        myGroup:         'Gruppo villaggi',
        targetVillages:  'Villaggi bersaglio',
        calculate:       'Calcola orari di invio',
        exportBB:        'Esporta BB Code',
        exportCSV:       'Esporta CSV',
        selectAll:       'Seleziona tutto',
        deselectAll:     'Deseleziona tutto',
        from:            'Da',
        target:          'Bersaglio',
        distance:        'Distanza',
        launchTime:      'Ora di invio',
        sendIn:          'Invia tra',
        send:            'Invia',
        noResults:       'Nessun invio calcolabile. Controlla l\'ora di arrivo.',
        wrongScreen:     'Questo script deve essere eseguito dal profilo di un giocatore.',
        ownProfile:      'Esegui questo script dal profilo di un giocatore nemico, non tuo.',
        noTargets:       'Nessun villaggio trovato su questo profilo.',
        fetchError:      'Errore nel recupero dei dati.',
        copied:          'Copiato!',
        nothingToExport: 'Niente da esportare.',
        attacks:         'attacco/i pianificato/i',
        surplusNote:     'villaggio/i in surplus (bersagli casuali)',
        premium:         'Questo script richiede un account Premium.',
        pastTime:        'L\'ora di arrivo è già passata.',
        loading:         'Caricamento...',
        resetGroup:      'Reimposta gruppo',
        groupReset:      'Gruppo reimpostato!',
    },
};

function tt(key) {
    var locale = translations[game_data.locale] ? game_data.locale : 'en_DK';
    return translations[locale][key] || translations['en_DK'][key] || key;
}

function initDebug() {
    if (DEBUG) {
        console.debug('[' + scriptData.name + ' ' + scriptData.version + '] Market:', game_data.market);
        console.debug('[' + scriptData.name + ' ' + scriptData.version + '] Screen:', game_data.screen);
        console.debug('[' + scriptData.name + ' ' + scriptData.version + '] Locale:', game_data.locale);
        console.debug('[' + scriptData.name + ' ' + scriptData.version + '] Target villages:', targetVillages.length);
        console.debug('[' + scriptData.name + ' ' + scriptData.version + '] My villages:', myVillages.length);
    }
}

// ─── Temps ───────────────────────────────────────────────────────────────────

function getServerTime() {
    var t = jQuery('#serverTime').text().trim().split(':');
    var d = jQuery('#serverDate').text().trim().split('/');
    return new Date(+d[2], +d[1] - 1, +d[0], +t[0], +t[1], +t[2]);
}

function parseLandingTime(str) {
    var parts = str.trim().split(' ');
    var d = parts[0].split('/');
    var t = (parts[1] || '00:00:00').split(':');
    return new Date(+d[2], +d[1] - 1, +d[0], +t[0], +t[1], +t[2]);
}

function formatDateTime(date) {
    function p(n) { return ('0' + n).slice(-2); }
    return p(date.getDate()) + '/' + p(date.getMonth() + 1) + '/' + date.getFullYear()
        + ' ' + p(date.getHours()) + ':' + p(date.getMinutes()) + ':' + p(date.getSeconds());
}

function secondsToHms(sec) {
    sec = Math.max(0, Math.floor(sec));
    function p(n) { return ('0' + n).slice(-2); }
    return p(Math.floor(sec / 3600)) + ':' + p(Math.floor((sec % 3600) / 60)) + ':' + p(sec % 60);
}

function calcDistance(c1, c2) {
    var a = c1.split('|'), b = c2.split('|');
    var dx = +a[0] - +b[0], dy = +a[1] - +b[1];
    return Math.sqrt(dx * dx + dy * dy);
}

// ─── Unités ───────────────────────────────────────────────────────────────────

function loadUnitInfo() {
    var stored = localStorage.getItem(LS_PREFIX + '_unitSpeeds');
    if (stored) {
        try {
            UNIT_SPEEDS = JSON.parse(stored);
            UNIT_INFO   = UNIT_SPEEDS;
            return jQuery.Deferred().resolve().promise();
        } catch (e) {}
    }
    return jQuery.ajax({ url: '/interface.php?func=get_unit_info' }).done(function (xml) {
        jQuery(xml).find('config').children().each(function () {
            UNIT_SPEEDS[jQuery(this).prop('nodeName')] = parseFloat(jQuery(this).find('speed').text());
        });
        UNIT_INFO = UNIT_SPEEDS;
        localStorage.setItem(LS_PREFIX + '_unitSpeeds', JSON.stringify(UNIT_SPEEDS));
    });
}

// ─── Villages cibles — LOGIQUE ORIGINALE v1.0 qui fonctionnait ───────────────

function fetchTargetVillages() {
    var villages = [];

    // Méthode 1 : table standard sur la page profil
    jQuery('#villages_list tr, #player_villages tr').each(function () {
        var $link = jQuery(this).find('a[href*="info_village"]');
        if (!$link.length) return;

        var href  = $link.attr('href') || '';
        var idMatch = href.match(/id=(\d+)/);
        if (!idMatch) return;

        // Coordonnées : d'abord dans le texte du lien, sinon dans la cellule adjacente
        var coord = ($link.text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0];
        if (!coord) {
            var cellText = jQuery(this).find('td').eq(1).text().trim();
            coord = (cellText.match(/\d{1,3}\|\d{1,3}/) || [])[0];
        }

        if (!coord) return;

        var id = +idMatch[1];
        var exists = villages.some(function (v) { return v.id === id; });
        if (!exists) villages.push({ id: id, coord: coord });
    });

    // Méthode 2 : fallback — tous les liens info_village de la page
    if (villages.length === 0) {
        jQuery('a[href*="info_village"]').each(function () {
            var href    = jQuery(this).attr('href') || '';
            var idMatch = href.match(/id=(\d+)/);
            if (!idMatch) return;

            var text    = jQuery(this).text().trim();
            var coord   = (text.match(/\d{1,3}\|\d{1,3}/) || [])[0];
            if (!coord) return;

            var id = +idMatch[1];
            var exists = villages.some(function (v) { return v.id === id; });
            if (!exists) villages.push({ id: id, coord: coord });
        });
    }

    return villages;
}

// ─── Mes villages ─────────────────────────────────────────────────────────────

function fetchMyVillages(groupId) {
    var url = game_data.link_base_pure + 'groups&ajax=load_villages_from_group';
    if (game_data.player.sitter > 0) url += '&t=' + game_data.player.id;

    return jQuery.post({
        url:      url,
        data:     { group_id: groupId },
        dataType: 'json',
        headers:  { 'TribalWars-Ajax': 1 },
    }).then(function (res) {
        var parser = new DOMParser();
        var doc    = parser.parseFromString(res.response.html, 'text/html');
        var list   = [];

        jQuery(doc).find('#group_table tbody tr').not(':first').each(function () {
            var $a    = jQuery(this).find('td:eq(0) a');
            var href  = $a.attr('href') || '';
            var idM   = href.match(/\d+/);
            var id    = $a.attr('data-village-id') || (idM ? idM[0] : null);
            var name  = jQuery(this).find('td:eq(0)').text().trim();
            var raw   = jQuery(this).find('td:eq(1)').text().trim();
            var coord = (raw.match(/\d{1,3}\|\d{1,3}/) || [])[0];
            if (id && coord) list.push({ id: +id, name: name, coord: coord });
        });

        return list;
    });
}

function fetchGroups() {
    var url = game_data.link_base_pure + 'groups&mode=overview&ajax=load_group_menu';
    if (game_data.player.sitter > 0) url += '&t=' + game_data.player.id;
    return jQuery.get(url);
}

// ─── Planification 1-pour-1 ──────────────────────────────────────────────────

function buildPlan(landingTime, unit, sigilPct) {
    var serverNow  = getServerTime().getTime();
    var speed      = UNIT_SPEEDS[unit] || 10;
    var sigilRatio = 1 + sigilPct / 100;
    var landingMs  = landingTime.getTime();

    if (landingMs <= serverNow) {
        UI.ErrorMessage(tt('pastTime'), 4000);
        return [];
    }

    var availableMe      = myVillages.slice();
    var remainingTargets = targetVillages.slice();
    var assigned         = [];

    // Phase 1 : chaque cible reçoit l'attaque du village le plus proche
    remainingTargets.forEach(function (tgt) {
        if (!availableMe.length) return;

        var bestIdx  = 0;
        var bestDist = calcDistance(availableMe[0].coord, tgt.coord);

        for (var i = 1; i < availableMe.length; i++) {
            var d = calcDistance(availableMe[i].coord, tgt.coord);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }

        var mine     = availableMe.splice(bestIdx, 1)[0];
        var travelMs = bestDist * speed * 60 * 1000 / sigilRatio;
        var launchMs = landingMs - travelMs;

        if (launchMs > serverNow) {
            assigned.push({ from: mine, target: tgt, dist: bestDist, launchMs: launchMs, extra: false });
        }
    });

    // Phase 2 : villages en surplus → cibles aléatoires
    availableMe.forEach(function (mine) {
        if (!targetVillages.length) return;
        var rnd      = targetVillages[Math.floor(Math.random() * targetVillages.length)];
        var dist     = calcDistance(mine.coord, rnd.coord);
        var travelMs = dist * speed * 60 * 1000 / sigilRatio;
        var launchMs = landingMs - travelMs;
        if (launchMs > serverNow) {
            assigned.push({ from: mine, target: rnd, dist: dist, launchMs: launchMs, extra: true });
        }
    });

    assigned.sort(function (a, b) { return a.launchMs - b.launchMs; });
    return assigned;
}

// ─── Tableau de résultats ────────────────────────────────────────────────────

function renderTable() {
    var $tbody    = jQuery('#op-results-body');
    var serverNow = getServerTime().getTime();
    $tbody.empty();

    if (!plan.length) {
        $tbody.append('<tr><td colspan="7" style="text-align:center;padding:8px;">' + tt('noResults') + '</td></tr>');
        jQuery('#op-count').text('0 ' + tt('attacks'));
        return;
    }

    var primary = plan.filter(function (r) { return !r.extra; });
    var extra   = plan.filter(function (r) { return r.extra; });
    var txt = primary.length + ' ' + tt('attacks');
    if (extra.length) txt += ' + ' + extra.length + ' ' + tt('surplusNote');
    jQuery('#op-count').text(txt);

    plan.forEach(function (row, idx) {
        var parts    = row.target.coord.split('|');
        var sitter   = game_data.player.sitter > 0 ? '&t=' + game_data.player.id : '';
        var rallyUrl = '/game.php?' + sitter + '&village=' + row.from.id
            + '&screen=place&x=' + parts[0] + '&y=' + parts[1];
        var remaining = secondsToHms((row.launchMs - serverNow) / 1000);
        var rowBg     = idx % 2 === 0 ? 'background-color:#fff5da;' : 'background-color:#f0e2be;';
        var extraTag  = row.extra
            ? ' <span style="font-size:9px;background:#7f8c8d;color:#fff;padding:1px 3px;border-radius:2px;">surplus</span>'
            : '';

        $tbody.append(
            '<tr style="' + rowBg + '">'
            + '<td style="padding:4px;text-align:center;"><input type="checkbox" class="op-check" checked data-idx="' + idx + '"/></td>'
            + '<td style="padding:4px;"><a href="' + game_data.link_base_pure + 'info_village&id=' + row.from.id + '" target="_blank">' + row.from.name + ' (' + row.from.coord + ')</a>' + extraTag + '</td>'
            + '<td style="padding:4px;text-align:center;"><a href="' + game_data.link_base_pure + 'info_village&id=' + row.target.id + '" target="_blank">' + row.target.coord + '</a></td>'
            + '<td style="padding:4px;text-align:center;">' + row.dist.toFixed(2) + '</td>'
            + '<td style="padding:4px;text-align:center;font-weight:600;">' + formatDateTime(new Date(row.launchMs)) + '</td>'
            + '<td style="padding:4px;text-align:center;"><span class="op-timer" data-launchms="' + row.launchMs + '">' + remaining + '</span></td>'
            + '<td style="padding:4px;text-align:center;"><a href="' + rallyUrl + '" target="_blank" class="btn btn-confirm-yes" style="padding:2px 8px;">' + tt('send') + '</a></td>'
            + '</tr>'
        );
    });

    startTicker();
}

function startTicker() {
    clearInterval(window._opTick);
    window._opTick = setInterval(function () {
        var now = getServerTime().getTime();
        jQuery('.op-timer').each(function () {
            var ms  = +jQuery(this).data('launchms');
            var sec = (ms - now) / 1000;
            jQuery(this).text(sec <= 0 ? '00:00:00' : secondsToHms(sec));
            if (sec <= 0) jQuery(this).closest('tr').css('opacity', '0.45');
            if (sec <= 10 && sec > 9) { try { TribalWars.playSound('chat'); } catch (e) {} }
        });
    }, 1000);
}

// ─── Export ───────────────────────────────────────────────────────────────────

function getChecked() {
    var result = [];
    jQuery('.op-check:checked').each(function () {
        var idx = +jQuery(this).data('idx');
        if (plan[idx]) result.push(plan[idx]);
    });
    return result;
}

function copyText(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); UI.SuccessMessage(tt('copied')); } catch (e) {}
    document.body.removeChild(ta);
}

function getBBCode() {
    var rows = getChecked();
    if (!rows.length) return '';
    var land = jQuery('#op-landing-time').val().trim();
    var bb = '[b]OP Planner[/b]\n[b]' + tt('landingTime') + ':[/b] ' + land + '\n\n';
    bb += '[table][**]' + tt('from') + '[||]' + tt('target') + '[||]' + tt('distance') + '[||]' + tt('launchTime') + '[||]' + tt('send') + '[/**]\n';
    rows.forEach(function (r) {
        var parts  = r.target.coord.split('|');
        var sitter = game_data.player.sitter > 0 ? '&t=' + game_data.player.id : '';
        var url    = window.location.origin + '/game.php?' + sitter + '&village=' + r.from.id + '&screen=place&x=' + parts[0] + '&y=' + parts[1];
        bb += '[*]' + r.from.name + ' (' + r.from.coord + ')[|]' + r.target.coord + '[|]' + r.dist.toFixed(2) + '[|]' + formatDateTime(new Date(r.launchMs)) + '[|][url=' + url + ']' + tt('send') + '[/url]\n';
    });
    bb += '[/table]';
    return bb;
}

function getCSV() {
    var rows = getChecked();
    if (!rows.length) return '';
    var lines = [['From', 'FromCoord', 'Target', 'Distance', 'LaunchTime'].join(';')];
    rows.forEach(function (r) {
        lines.push([r.from.name, r.from.coord, r.target.coord, r.dist.toFixed(2), formatDateTime(new Date(r.launchMs))].join(';'));
    });
    return lines.join('\n');
}

// ─── Interface ────────────────────────────────────────────────────────────────

function renderGroupSelect(groups, selectedId) {
    var html = '<select id="op-group" style="width:100%;padding:5px;font-size:14px;border:1px solid #000;">';
    (groups.result || []).forEach(function (g) {
        if (g.type === 'separator') { html += '<option disabled/>'; return; }
        html += '<option value="' + g.group_id + '"' + (g.group_id == selectedId ? ' selected' : '') + '>' + g.name + '</option>';
    });
    html += '</select>';
    return html;
}

function renderUnitSelector() {
    var units  = game_data.units || ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'];
    var skip   = ['spy', 'militia'];
    var saved  = localStorage.getItem(LS_PREFIX + '_unit') || 'axe';

    var thUnits = '', tdUnits = '';
    units.forEach(function (u) {
        if (skip.indexOf(u) >= 0) return;
        thUnits += '<th style="text-align:center;padding:4px;"><label for="op_u_' + u + '"><img src="/graphic/unit/unit_' + u + '.webp" style="cursor:pointer;" title="' + u + '"></label></th>';
        tdUnits += '<td style="text-align:center;padding:4px;"><input type="radio" name="op_unit" id="op_u_' + u + '" value="' + u + '"' + (u === saved ? ' checked' : '') + '></td>';
    });

    return '<table class="ra-table" width="100%"><thead><tr>' + thUnits + '</tr></thead><tbody><tr>' + tdUnits + '</tr></tbody></table>';
}

function buildUI(groups) {
    var savedGroup = localStorage.getItem(LS_PREFIX + '_group') || 0;
    var savedSigil = localStorage.getItem(LS_PREFIX + '_sigil') || '0';
    var serverNow  = formatDateTime(getServerTime());

    var content =
        '<div class="ra-single-village-planner" id="opPlannerBlock">'
        + '<h2>' + tt('title') + '</h2>'
        + '<div class="ra-single-village-planner-data">'

        + '<div class="ra-mb15">'
            + '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:0 20px;">'
                + '<div><label>' + tt('landingTime') + '</label><input id="op-landing-time" type="text" value="' + serverNow + '"></div>'
                + '<div><label>' + tt('sigil') + '</label><input id="op-sigil" type="text" value="' + savedSigil + '"></div>'
                + '<div><label>' + tt('myGroup') + '</label>' + renderGroupSelect(groups, savedGroup) + '</div>'
            + '</div>'
        + '</div>'

        + '<div class="ra-mb15">'
            + '<label>' + tt('unit') + '</label>'
            + renderUnitSelector()
        + '</div>'

        + '<div class="ra-mb15" style="font-size:11px;">'
            + '<span id="op-info-mine" style="color:#603000;"></span>'
            + ' &nbsp;|&nbsp; '
            + '<span id="op-info-targets" style="color:#603000;">' + targetVillages.length + ' ' + tt('targetVillages') + '</span>'
        + '</div>'

        + '<div class="ra-mb15">'
            + '<a href="javascript:void(0);" id="op-calculate" class="btn btn-confirm-yes">' + tt('calculate') + '</a>'
            + ' <a href="javascript:void(0);" id="op-export-bb" class="btn">' + tt('exportBB') + '</a>'
            + ' <a href="javascript:void(0);" id="op-export-csv" class="btn">' + tt('exportCSV') + '</a>'
            + ' <a href="javascript:void(0);" id="op-select-all" class="btn">' + tt('selectAll') + '</a>'
            + ' <a href="javascript:void(0);" id="op-deselect-all" class="btn">' + tt('deselectAll') + '</a>'
            + ' <a href="javascript:void(0);" id="op-reset-group" class="btn">' + tt('resetGroup') + '</a>'
        + '</div>'

        + '<div id="op-results-wrap" style="display:none;">'
            + '<div id="op-count" style="font-weight:bold;margin-bottom:6px;"></div>'
            + '<div style="overflow-x:auto;max-height:400px;overflow-y:auto;">'
            + '<table class="ra-table" width="100%">'
                + '<thead><tr>'
                    + '<th style="width:20px;"></th>'
                    + '<th style="text-align:left;">' + tt('from') + '</th>'
                    + '<th style="text-align:center;">' + tt('target') + '</th>'
                    + '<th style="text-align:center;">' + tt('distance') + '</th>'
                    + '<th style="text-align:center;">' + tt('launchTime') + '</th>'
                    + '<th style="text-align:center;">' + tt('sendIn') + '</th>'
                    + '<th style="text-align:center;">' + tt('send') + '</th>'
                + '</tr></thead>'
                + '<tbody id="op-results-body"></tbody>'
            + '</table>'
            + '</div>'
        + '</div>'

        + '</div>'
        + '<br>'
        + '<small><strong>' + tt('title') + ' ' + scriptData.version + '</strong>'
        + ' - <a href="' + scriptData.authorUrl + '" target="_blank" rel="noopener">' + scriptData.author + '</a>'
        + ' - <a href="' + scriptData.helpLink + '" target="_blank" rel="noopener">Help</a></small>'
        + '</div>'

        + '<style>'
        + '.ra-single-village-planner{position:relative;display:block;width:auto;height:auto;clear:both;margin:0 auto 15px;padding:10px;border:1px solid #603000;box-sizing:border-box;background:#f4e4bc;}'
        + '.ra-single-village-planner *{box-sizing:border-box;}'
        + '.ra-single-village-planner h2{margin:0 0 10px;font-size:14px;}'
        + '.ra-single-village-planner label{font-weight:600!important;margin-bottom:5px;display:block;}'
        + '.ra-single-village-planner input[type="text"],.ra-single-village-planner select{width:100%;padding:5px 10px;border:1px solid #000;font-size:16px;line-height:1;}'
        + '.ra-single-village-planner .btn{padding:3px 4px;}'
        + '.ra-mb15{margin-bottom:15px;}'
        + '.ra-table{border-collapse:separate!important;border-spacing:2px!important;}'
        + '.ra-table th{font-size:14px;}'
        + '.ra-table th,.ra-table td{padding:5px;text-align:center;}'
        + '.ra-table tr:nth-of-type(2n) td{background-color:#f0e2be;}'
        + '.ra-table tr:nth-of-type(2n+1) td{background-color:#fff5da;}'
        + '</style>';

    if (jQuery('#opPlannerBlock').length === 0) {
        jQuery('#contentContainer, #content_value').first().prepend(content);
    }

    updateVillageInfo();
    bindEvents();
}

function updateVillageInfo() {
    jQuery('#op-info-mine').text(myVillages.length + ' ' + tt('myGroup'));
    jQuery('#op-info-targets').text(targetVillages.length + ' ' + tt('targetVillages'));
}

// ─── Événements ───────────────────────────────────────────────────────────────

function bindEvents() {

    jQuery('#op-calculate').off('click').on('click', function (e) {
        e.preventDefault();

        var landStr  = jQuery('#op-landing-time').val().trim();
        var unit     = jQuery('input[name="op_unit"]:checked').val();
        var sigilPct = parseFloat(jQuery('#op-sigil').val()) || 0;
        var groupId  = jQuery('#op-group').val();

        if (!landStr || !unit) return;

        localStorage.setItem(LS_PREFIX + '_unit',  unit);
        localStorage.setItem(LS_PREFIX + '_sigil', sigilPct);
        localStorage.setItem(LS_PREFIX + '_group', groupId);

        var landing = parseLandingTime(landStr);
        var $btn    = jQuery(this);
        $btn.text(tt('loading')).prop('disabled', true);

        fetchMyVillages(groupId).then(function (list) {
            myVillages = list;
            updateVillageInfo();
            plan = buildPlan(landing, unit, sigilPct);
            jQuery('#op-results-wrap').show();
            renderTable();
            $btn.text(tt('calculate')).prop('disabled', false);
        }).fail(function () {
            UI.ErrorMessage(tt('fetchError'));
            $btn.text(tt('calculate')).prop('disabled', false);
        });
    });

    jQuery('#op-landing-time').off('keydown').on('keydown', function (e) {
        if (e.which === 13) jQuery('#op-calculate').trigger('click');
    });

    jQuery('#op-export-bb').off('click').on('click', function (e) {
        e.preventDefault();
        var bb = getBBCode();
        if (!bb) { UI.ErrorMessage(tt('nothingToExport')); return; }
        var html = '<div style="width:420px;"><textarea id="op-bb-ta" readonly style="width:100%;height:120px;resize:none;">' + bb + '</textarea></div>';
        Dialog.show('op_bb', html);
        setTimeout(function () { jQuery('#op-bb-ta').select(); document.execCommand('copy'); UI.SuccessMessage(tt('copied')); }, 100);
    });

    jQuery('#op-export-csv').off('click').on('click', function (e) {
        e.preventDefault();
        var csv = getCSV();
        if (!csv) { UI.ErrorMessage(tt('nothingToExport')); return; }
        copyText(csv);
    });

    jQuery('#op-select-all').off('click').on('click', function (e) {
        e.preventDefault();
        jQuery('.op-check').prop('checked', true);
    });

    jQuery('#op-deselect-all').off('click').on('click', function (e) {
        e.preventDefault();
        jQuery('.op-check').prop('checked', false);
    });

    jQuery('#op-reset-group').off('click').on('click', function (e) {
        e.preventDefault();
        localStorage.removeItem(LS_PREFIX + '_group');
        UI.SuccessMessage(tt('groupReset'));
        jQuery('#op-group').val(0);
        fetchMyVillages(0).then(function (list) {
            myVillages = list;
            updateVillageInfo();
        });
    });

    jQuery('#op-group').off('change').on('change', function () {
        fetchMyVillages(jQuery(this).val()).then(function (list) {
            myVillages = list;
            updateVillageInfo();
        });
    });
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

(function () {
    initDebug();

    if (!game_data.features.Premium.active) {
        UI.ErrorMessage(tt('premium'));
        return;
    }

    var screen = new URL(window.location.href).searchParams.get('screen');

    if (screen !== 'info_player') {
        UI.ErrorMessage(tt('wrongScreen'), 5000);
        return;
    }

    var targetId = new URL(window.location.href).searchParams.get('id');
    if (targetId && +targetId === +game_data.player.id) {
        UI.ErrorMessage(tt('ownProfile'), 5000);
        return;
    }

    var savedGroup = localStorage.getItem(LS_PREFIX + '_group') || 0;

    jQuery.when(
        loadUnitInfo(),
        fetchGroups(),
        fetchMyVillages(savedGroup)
    ).then(function () {
        var groups   = arguments[1][0];
        var villages = arguments[2][0];

        myVillages     = villages || [];
        targetVillages = fetchTargetVillages();

        if (targetVillages.length === 0) {
            UI.ErrorMessage(tt('noTargets'), 5000);
            return;
        }

        buildUI(groups);
    }).fail(function () {
        UI.ErrorMessage(tt('fetchError'));
    });
})();
