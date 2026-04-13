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
        noResults:       'Aucun envoi possible avec ces paramètres.',
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
        help:            'Aide',
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
        noResults:       'No attacks can be planned with these settings.',
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
        help:            'Help',
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
        help:            'Hilfe',
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
        help:            'Ajuda',
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
        ownProfile:      'Esegui dal profilo di un giocatore nemico, non tuo.',
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
        help:            'Aiuto',
    },
    nl_NL: {
        title:           'OP Planner — Operatieplanner',
        landingTime:     'Aankomsttijd (dd/mm/jjjj UU:mm:ss)',
        unit:            'Referentie-eenheid',
        sigil:           'Snelheidsbonus (%)',
        myGroup:         'Mijn dorpsgroep',
        targetVillages:  'Doeldorpen',
        calculate:       'Verzendtijden berekenen',
        exportBB:        'Exporteer BB Code',
        exportCSV:       'Exporteer CSV',
        selectAll:       'Alles selecteren',
        deselectAll:     'Alles deselecteren',
        from:            'Van',
        target:          'Doel',
        distance:        'Afstand',
        launchTime:      'Verzendtijd',
        sendIn:          'Versturen over',
        send:            'Sturen',
        noResults:       'Geen aanvallen planbaar met deze instellingen.',
        wrongScreen:     'Dit script moet worden uitgevoerd vanuit een spelersprofiel.',
        ownProfile:      'Voer dit script uit vanuit het profiel van een vijandige speler.',
        noTargets:       'Geen dorpen gevonden op dit profiel.',
        fetchError:      'Fout bij ophalen van gegevens.',
        copied:          'Gekopieerd!',
        nothingToExport: 'Niets te exporteren.',
        attacks:         'aanval(len) gepland',
        surplusNote:     'overschotsdorp/-dorpen (willekeurige doelen)',
        premium:         'Dit script vereist een Premium-account.',
        pastTime:        'De aankomsttijd is al verstreken.',
        loading:         'Laden...',
        resetGroup:      'Groep resetten',
        groupReset:      'Groep gereset!',
        help:            'Help',
    },
    pl_PL: {
        title:           'OP Planner — Planista Operacji',
        landingTime:     'Czas przybycia (dd/mm/rrrr GG:mm:ss)',
        unit:            'Jednostka referencyjna',
        sigil:           'Bonus prędkości (%)',
        myGroup:         'Moja grupa wiosek',
        targetVillages:  'Wioski docelowe',
        calculate:       'Oblicz czasy wysyłania',
        exportBB:        'Eksportuj BB Code',
        exportCSV:       'Eksportuj CSV',
        selectAll:       'Zaznacz wszystko',
        deselectAll:     'Odznacz wszystko',
        from:            'Z',
        target:          'Cel',
        distance:        'Odległość',
        launchTime:      'Czas wysyłania',
        sendIn:          'Wyślij za',
        send:            'Wyślij',
        noResults:       'Brak możliwych ataków z tymi ustawieniami.',
        wrongScreen:     'Ten skrypt musi być uruchomiony z profilu gracza.',
        ownProfile:      'Uruchom ten skrypt z profilu wrogiego gracza, nie swojego.',
        noTargets:       'Nie znaleziono wiosek na tym profilu.',
        fetchError:      'Błąd podczas pobierania danych.',
        copied:          'Skopiowano!',
        nothingToExport: 'Brak danych do eksportu.',
        attacks:         'atak(i) zaplanowane',
        surplusNote:     'wioska(-i) nadmiarowe (losowe cele)',
        premium:         'Ten skrypt wymaga konta Premium.',
        pastTime:        'Czas przybycia już minął.',
        loading:         'Ładowanie...',
        resetGroup:      'Resetuj grupę',
        groupReset:      'Grupa zresetowana!',
        help:            'Pomoc',
    },
};

function tt(key) {
    var locale = translations[game_data.locale] ? game_data.locale : 'en_DK';
    return translations[locale][key] || translations['en_DK'][key] || key;
}

function initDebug() {
    if (DEBUG) {
        console.debug('[' + scriptData.name + ' ' + scriptData.version + '] Screen:', game_data.screen);
        console.debug('[' + scriptData.name + ' ' + scriptData.version + '] Locale:', game_data.locale);
    }
}

// ─── Temps ────────────────────────────────────────────────────────────────────

function getServerTime() {
    var t = $('#serverTime').text().trim();
    var d = $('#serverDate').text().trim().split('/');
    var parts = t.split(':');
    return new Date(+d[2], +d[1]-1, +d[0], +parts[0], +parts[1], +parts[2]);
}

function parseLandingTime(str) {
    var parts = str.trim().split(' ');
    var dateParts = parts[0].split('/');
    var timeParts = (parts[1] || '00:00:00').split(':');
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
    var a = c1.split('|'), b = c2.split('|');
    var dx = +a[0] - +b[0], dy = +a[1] - +b[1];
    return Math.sqrt(dx*dx + dy*dy);
}

// ─── Unités ───────────────────────────────────────────────────────────────────

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
        try {
            UNIT_SPEEDS = JSON.parse(stored);
            UNIT_INFO   = UNIT_SPEEDS;
            return $.Deferred().resolve().promise();
        } catch(e) {}
    }
    return fetchUnitInfo();
}

// ─── Villages cibles — logique originale v1.0 ────────────────────────────────

function fetchTargetVillages() {
    var villages = [];

    $('#villages_list tr, #player_villages tr').each(function() {
        var $link = $(this).find('a[href*="info_village"]');
        if (!$link.length) return;

        var href    = $link.attr('href') || '';
        var idMatch = href.match(/id=(\d+)/);
        if (!idMatch) return;

        var coord = ($link.text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0];
        if (!coord) {
            var cellText = $(this).find('td').eq(1).text().trim();
            coord = (cellText.match(/\d{1,3}\|\d{1,3}/) || [])[0];
        }
        if (!coord) return;

        var id = +idMatch[1];
        var exists = villages.some(function(v){ return v.id === id; });
        if (!exists) villages.push({ id: id, coord: coord });
    });

    if (villages.length === 0) {
        $('a[href*="info_village"]').each(function() {
            var href    = $(this).attr('href') || '';
            var idMatch = href.match(/id=(\d+)/);
            if (!idMatch) return;

            var text  = $(this).text().trim();
            var coord = (text.match(/\d{1,3}\|\d{1,3}/) || [])[0];
            if (!coord) return;

            var id = +idMatch[1];
            var exists = villages.some(function(v){ return v.id === id; });
            if (!exists) villages.push({ id: id, coord: coord });
        });
    }

    return villages;
}

// ─── Mes villages ─────────────────────────────────────────────────────────────

function fetchMyVillages(groupId) {
    var url = game_data.link_base_pure + 'groups&ajax=load_villages_from_group';
    if (game_data.player.sitter > 0) url += '&t='+game_data.player.id;

    return $.post({
        url:      url,
        data:     { group_id: groupId },
        dataType: 'json',
        headers:  { 'TribalWars-Ajax': 1 }
    }).then(function(res) {
        var parser = new DOMParser();
        var doc    = parser.parseFromString(res.response.html, 'text/html');
        var list   = [];
        $(doc).find('#group_table tbody tr').not(':first').each(function() {
            var $a    = $(this).find('td:eq(0) a');
            var href  = $a.attr('href') || '';
            var idM   = href.match(/\d+/);
            var id    = $a.attr('data-village-id') || (idM ? idM[0] : null);
            var name  = $(this).find('td:eq(0)').text().trim();
            var raw   = $(this).find('td:eq(1)').text().trim();
            var coord = (raw.match(/\d{1,3}\|\d{1,3}/) || [])[0];
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

    remainingTargets.forEach(function(tgt) {
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

    availableMe.forEach(function(mine) {
        if (!targetVillages.length) return;
        var rnd      = targetVillages[Math.floor(Math.random() * targetVillages.length)];
        var dist     = calcDistance(mine.coord, rnd.coord);
        var travelMs = dist * speed * 60 * 1000 / sigilRatio;
        var launchMs = landingMs - travelMs;
        if (launchMs > serverNow) {
            assigned.push({ from: mine, target: rnd, dist: dist, launchMs: launchMs, extra: true });
        }
    });

    assigned.sort(function(a, b){ return a.launchMs - b.launchMs; });
    return assigned;
}

// ─── Tableau ─────────────────────────────────────────────────────────────────

function renderTable() {
    var serverNow = getServerTime().getTime();
    var $tbody    = $('#op-results-body');
    $tbody.empty();

    if (plan.length === 0) {
        $tbody.append('<tr><td colspan="7" style="text-align:center;padding:8px;">' + tt('noResults') + '</td></tr>');
        $('#op-count').text('0 ' + tt('attacks'));
        return;
    }

    var primary = plan.filter(function(r){ return !r.extra; });
    var extra   = plan.filter(function(r){ return r.extra; });
    var txt = primary.length + ' ' + tt('attacks');
    if (extra.length) txt += ' + ' + extra.length + ' ' + tt('surplusNote');
    $('#op-count').text(txt);

    plan.forEach(function(row, idx) {
        var parts     = row.target.coord.split('|');
        var sitter    = game_data.player.sitter > 0 ? '&t='+game_data.player.id : '';
        var rallyUrl  = '/game.php?'+sitter+'&village='+row.from.id+'&screen=place&x='+parts[0]+'&y='+parts[1];
        var remaining = secondsToHms((row.launchMs - serverNow) / 1000);
        var rowBg     = idx % 2 === 0 ? 'background-color:#fff5da;' : 'background-color:#f0e2be;';
        var extraTag  = row.extra ? ' <span style="font-size:9px;background:#7f8c8d;color:#fff;padding:1px 3px;border-radius:2px;">surplus</span>' : '';

        $tbody.append(
            '<tr style="'+rowBg+'">'
            +'<td style="padding:4px;text-align:center;"><input type="checkbox" class="op-check" checked data-idx="'+idx+'"/></td>'
            +'<td style="padding:4px;"><a href="'+game_data.link_base_pure+'info_village&id='+row.from.id+'" target="_blank">'+row.from.name+' ('+row.from.coord+')</a>'+extraTag+'</td>'
            +'<td style="padding:4px;text-align:center;"><a href="'+game_data.link_base_pure+'info_village&id='+row.target.id+'" target="_blank">'+row.target.coord+'</a></td>'
            +'<td style="padding:4px;text-align:center;">'+row.dist.toFixed(2)+'</td>'
            +'<td style="padding:4px;text-align:center;font-weight:600;">'+formatDateTime(new Date(row.launchMs))+'</td>'
            +'<td style="padding:4px;text-align:center;"><span class="op-timer" data-launchms="'+row.launchMs+'">'+remaining+'</span></td>'
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
        var sitter = game_data.player.sitter > 0 ? '&t='+game_data.player.id : '';
        var url    = window.location.origin+'/game.php?'+sitter+'&village='+row.from.id+'&screen=place&x='+parts[0]+'&y='+parts[1];
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
    var html = '<select id="op-group" style="width:100%;padding:5px 10px;border:1px solid #000;font-size:16px;line-height:1;">';
    (groups.result || []).forEach(function(g) {
        if (g.type === 'separator') { html += '<option disabled/>'; return; }
        html += '<option value="'+g.group_id+'"'+(g.group_id==selectedId?' selected':'')+'>'+g.name+'</option>';
    });
    html += '</select>';
    return html;
}

function renderUnitSelector() {
    var units = game_data.units || ['spear','sword','axe','archer','spy','light','marcher','heavy','ram','catapult','knight','snob'];
    var skip  = ['spy','militia'];
    var saved = localStorage.getItem(LS_PREFIX+'_unit') || 'axe';

    var thUnits = '', tdUnits = '';
    units.forEach(function(u) {
        if (skip.indexOf(u) >= 0) return;
        thUnits += '<th style="text-align:center;padding:2px;"><label for="op_unit_'+u+'"><img src="/graphic/unit/unit_'+u+'.webp" style="width:22px;height:22px;cursor:pointer;" title="'+u+'"></label></th>';
        tdUnits += '<td style="text-align:center;padding:2px;"><input type="radio" name="op_unit" id="op_unit_'+u+'" value="'+u+'"'+(u===saved?' checked':'')+'></td>';
    });

    return '<table class="vis" width="100%"><thead><tr>'+thUnits+'</tr></thead><tbody><tr>'+tdUnits+'</tr></tbody></table>';
}

function inputStyle() {
    return 'width:100%;padding:5px 10px;border:1px solid #000;font-size:16px;line-height:1;';
}

function buildUI(groups) {
    var savedGroup = localStorage.getItem(LS_PREFIX+'_group') || 0;
    var savedSigil = localStorage.getItem(LS_PREFIX+'_sigil') || '0';
    var serverNow  = formatDateTime(getServerTime());

    var html = '<div class="ra-single-village-planner" id="opPlannerBlock">'
        + '<h2>'+tt('title')+'</h2>'
        + '<div class="ra-single-village-planner-data">'

        + '<div class="ra-mb15"><div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:0 20px;">'
            + '<div><label>'+tt('landingTime')+'</label><input id="op-landing-time" type="text" value="'+serverNow+'"></div>'
            + '<div><label>'+tt('sigil')+'</label><input id="op-sigil" type="text" value="'+savedSigil+'"></div>'
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
            + '<div style="overflow-x:auto;max-height:400px;overflow-y:auto;">'
            + '<table class="ra-table" width="100%">'
                + '<thead><tr>'
                    + '<th style="width:20px;"></th>'
                    + '<th style="text-align:left;">'+tt('from')+'</th>'
                    + '<th style="text-align:center;">'+tt('target')+'</th>'
                    + '<th style="text-align:center;">'+tt('distance')+'</th>'
                    + '<th style="text-align:center;">'+tt('launchTime')+'</th>'
                    + '<th style="text-align:center;">'+tt('sendIn')+'</th>'
                    + '<th style="text-align:center;">'+tt('send')+'</th>'
                + '</tr></thead>'
                + '<tbody id="op-results-body"></tbody>'
            + '</table>'
            + '</div>'
        + '</div>'

        + '</div>'
        + '<br>'
        + '<small><strong>'+tt('title')+' '+scriptData.version+'</strong>'
        + ' - <a href="'+scriptData.authorUrl+'" target="_blank" rel="noopener">'+scriptData.author+'</a>'
        + ' - <a href="'+scriptData.helpLink+'" target="_blank" rel="noopener">'+tt('help')+'</a></small>'
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

    if ($('#opPlannerBlock').length === 0) {
        $('#contentContainer, #content_value').first().prepend(html);
    }

    $('#op-info-mine').text(myVillages.length + ' ' + tt('myGroup'));
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
        var $btn    = $(this);
        $btn.text(tt('loading')).prop('disabled', true);

        fetchMyVillages(groupId).then(function(list) {
            myVillages = list;
            $('#op-info-mine').text(myVillages.length + ' ' + tt('myGroup'));
            plan = buildPlan(landing, unit, sigilPct);
            $('#op-results-wrap').show();
            renderTable();
            $btn.text(tt('calculate')).prop('disabled', false);
        }).fail(function() {
            UI.ErrorMessage(tt('fetchError'));
            $btn.text(tt('calculate')).prop('disabled', false);
        });
    });

    $('#op-landing-time').off('keydown').on('keydown', function(e) {
        if (e.which === 13) $('#op-calculate').trigger('click');
    });

    $('#op-export-bb').off('click').on('click', function(e) {
        e.preventDefault();
        var bb = getBBCode();
        if (!bb) { UI.ErrorMessage(tt('nothingToExport')); return; }
        var content = '<div style="width:400px;"><textarea id="op-bb-ta" readonly style="width:100%;height:120px;resize:none;">'+bb+'</textarea></div>';
        Dialog.show('op_bb', content);
        setTimeout(function(){ $('#op-bb-ta').select(); document.execCommand('copy'); UI.SuccessMessage(tt('copied')); }, 100);
    });

    $('#op-export-csv').off('click').on('click', function(e) {
        e.preventDefault();
        var csv = getCSV();
        if (!csv) { UI.ErrorMessage(tt('nothingToExport')); return; }
        copyToClipboard(csv);
    });

    $('#op-select-all').off('click').on('click', function(e) {
        e.preventDefault();
        $('.op-check').prop('checked', true);
    });

    $('#op-deselect-all').off('click').on('click', function(e) {
        e.preventDefault();
        $('.op-check').prop('checked', false);
    });

    $('#op-reset-group').off('click').on('click', function(e) {
        e.preventDefault();
        localStorage.removeItem(LS_PREFIX+'_group');
        UI.SuccessMessage(tt('groupReset'));
        $('#op-group').val(0);
        fetchMyVillages(0).then(function(list) {
            myVillages = list;
            $('#op-info-mine').text(myVillages.length + ' ' + tt('myGroup'));
        });
    });

    $('#op-group').off('change').on('change', function() {
        fetchMyVillages($(this).val()).then(function(list) {
            myVillages = list;
            $('#op-info-mine').text(myVillages.length + ' ' + tt('myGroup'));
        });
    });
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────

(function() {
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

    $.when(
        loadUnitInfo(),
        fetchGroups()
    ).then(function() {
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
        }).fail(function() {
            UI.ErrorMessage(tt('fetchError'));
        });
    });

})();
