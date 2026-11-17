/*
 * Script Name: Noble Planner
 * Version: v1.1
 * Author: Schadrac
 * Screen: info_player
 * Description: Planifie l'envoi d'un train de nobles (nuke + 4 nobles) vers un village cible.
 */

var NoblePlanner = NoblePlanner || {};

(function ($) {
    var LS_PREFIX  = 'schadrac_noblePlanner';
    var UNIT_SPEEDS = {};

    // ─── Traductions ──────────────────────────────────────────────────────────
    var T = {
        fr_FR: {
            title:       'Noble Planner — Train de nobles',
            targetVill:  'Village cible',
            nobleVill:   'Village noble (source des nobles)',
            nukeVill:    'Village nuke (facultatif, différent)',
            landingTime: 'Heure d\'arrivée du nuke (jj/mm/aaaa HH:mm:ss)',
            nobleGap:    'Écart entre nobles (secondes)',
            nukeLead:    'Avance du nuke (secondes avant le 1er noble)',
            sigil:       'Bonus vitesse (%)',
            myGroup:     'Groupe de villages',
            calculate:   'Calculer',
            send:        'Envoyer',
            exportBB:    'Exporter BB',
            nuke:        'Nuke',
            noble:       'Noble',
            launchTime:  'Heure d\'envoi',
            sendIn:      'Envoi dans',
            distance:    'Distance',
            wrongScreen: 'Ce script doit être exécuté depuis le profil d\'un joueur adverse.',
            ownProfile:  'Exécutez depuis le profil d\'un joueur adverse, pas le vôtre.',
            noTargets:   'Aucun village trouvé sur ce profil.',
            pastTime:    'L\'heure d\'arrivée est déjà passée.',
            selectTarget:'Sélectionnez un village cible',
            selectNoble: 'Sélectionnez un village noble',
            premium:     'Ce script nécessite un compte Premium.',
            fetchError:  'Erreur de chargement des données.',
            loading:     'Chargement...',
            copied:      'Copié !',
            invalidDate: 'Format de date invalide. Exemple : 17/11/2026 22:00:00',
            nukeUnit:    'Unité la plus lente du nuke',
            target:      'Cible',
            arrival:     'Arrivée',
            optional:    '(optionnel)',
            sameAsNoble: '— Même que noble —',
            nothing:     'Rien à exporter.',
            missing:     'Village introuvable, rechargez le script.',
        },
        en_DK: {
            title:       'Noble Planner — Noble Train',
            targetVill:  'Target village',
            nobleVill:   'Noble village (source of nobles)',
            nukeVill:    'Nuke village (optional, different)',
            landingTime: 'Nuke landing time (dd/mm/yyyy HH:mm:ss)',
            nobleGap:    'Gap between nobles (seconds)',
            nukeLead:    'Nuke lead (seconds before noble 1)',
            sigil:       'Speed bonus (%)',
            myGroup:     'Village group',
            calculate:   'Calculate',
            send:        'Send',
            exportBB:    'Export BB',
            nuke:        'Nuke',
            noble:       'Noble',
            launchTime:  'Launch Time',
            sendIn:      'Send in',
            distance:    'Distance',
            wrongScreen: 'Run this script from an enemy player profile.',
            ownProfile:  'Run from an enemy profile, not your own.',
            noTargets:   'No villages found on this profile.',
            pastTime:    'Landing time is in the past.',
            selectTarget:'Select a target village',
            selectNoble: 'Select a noble village',
            premium:     'This script requires a Premium account.',
            fetchError:  'Error loading data.',
            loading:     'Loading...',
            copied:      'Copied!',
            invalidDate: 'Invalid date format. Example: 17/11/2026 22:00:00',
            nukeUnit:    'Slowest unit in the nuke',
            target:      'Target',
            arrival:     'Arrival',
            optional:    '(optional)',
            sameAsNoble: '— Same as noble —',
            nothing:     'Nothing to export.',
            missing:     'Village not found, reload the script.',
        },
    };

    function tt(key) {
        var loc = T[game_data.locale] ? game_data.locale : 'en_DK';
        return T[loc][key] || T['en_DK'][key] || key;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function getServerTime() {
        var t = $('#serverTime').text().trim().split(':');
        var d = $('#serverDate').text().trim().split('/');
        return new Date(+d[2], +d[1]-1, +d[0], +t[0], +t[1], +t[2]);
    }

    // jj/mm/aaaa HH:mm[:ss[:mmm]] → Date (invalide si le format est mauvais)
    function parseLandingTime(str) {
        var m = String(str || '').trim().match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:[:.](\d{1,3}))?)?$/);
        if (!m) return new Date(NaN);
        var d = new Date(+m[3], +m[2]-1, +m[1], +(m[4]||0), +(m[5]||0), +(m[6]||0), +(m[7]||0));
        if (d.getDate() !== +m[1] || d.getMonth() !== +m[2]-1 || +(m[4]||0) > 23 || +(m[6]||0) > 59) return new Date(NaN);
        return d;
    }

    function formatDateTime(date, withMs) {
        var p = function(n){ return ('0'+n).slice(-2); };
        return p(date.getDate())+'/'+p(date.getMonth()+1)+'/'+date.getFullYear()
            +' '+p(date.getHours())+':'+p(date.getMinutes())+':'+p(date.getSeconds())
            +(withMs ? ':'+('00'+date.getMilliseconds()).slice(-3) : '');
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
            return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
        });
    }

    // Nombre saisi ; garde 0 comme valeur valide (contrairement à « x || défaut »)
    function numOr(val, def) {
        var n = parseFloat(String(val).replace(',', '.'));
        return isNaN(n) || n < 0 ? def : n;
    }

    // Trajet en ms, arrondi à la seconde comme le jeu
    function travelMsFor(dist, speed, sigilPct) {
        return Math.round(dist * speed * 60 / (1 + sigilPct/100)) * 1000;
    }

    function secondsToHms(sec) {
        sec = Math.max(0, Math.floor(sec));
        return ('0'+Math.floor(sec/3600)).slice(-2)+':'
            +('0'+Math.floor((sec%3600)/60)).slice(-2)+':'
            +('0'+(sec%60)).slice(-2);
    }

    function calcDist(c1, c2) {
        var a = c1.split('|'), b = c2.split('|');
        return Math.sqrt(Math.pow(+a[0]-+b[0],2)+Math.pow(+a[1]-+b[1],2));
    }

    // ─── Données ──────────────────────────────────────────────────────────────

    function fetchUnitInfo() {
        try {
            var c = JSON.parse(localStorage.getItem(LS_PREFIX+'_speeds') || 'null');
            if (c && c.ts && Date.now() - c.ts < 86400000 && c.data && c.data.snob) {
                UNIT_SPEEDS = c.data;
                return $.Deferred().resolve().promise();
            }
        } catch (e) {}
        return $.ajax({ url: '/interface.php?func=get_unit_info', dataType: 'xml' }).then(function(xml) {
            $(xml).find('config').children().each(function() {
                var speed = parseFloat($(this).find('speed').text());
                if (!isNaN(speed) && speed > 0) UNIT_SPEEDS[$(this).prop('nodeName')] = speed;
            });
            try { localStorage.setItem(LS_PREFIX+'_speeds', JSON.stringify({ ts: Date.now(), data: UNIT_SPEEDS })); } catch (e) {}
        });
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
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var list = [];
            $(doc).find('#group_table tbody tr').each(function() {
                var $a   = $(this).find('td:eq(0) a');
                var href = $a.attr('href') || '';
                var idM  = href.match(/[?&]village=(\d+)/) || href.match(/[?&]id=(\d+)/);
                var id   = $a.attr('data-village-id') || (idM ? idM[1] : null);
                var name = $(this).find('td:eq(0)').text().trim();
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

    function fetchTargetVillages() {
        var villages = [];
        $('#villages_list tr, #player_villages tr').each(function() {
            var $link = $(this).find('a[href*="info_village"]');
            if (!$link.length) return;
            var href = $link.attr('href') || '';
            var idM  = href.match(/id=(\d+)/);
            if (!idM) return;
            var coord = ($link.text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0]
                     || ($(this).find('td').eq(1).text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0];
            if (!coord) return;
            var id = +idM[1];
            if (!villages.some(function(v){ return v.id === id; }))
                villages.push({ id: id, coord: coord });
        });
        if (!villages.length) {
            $('#content_value a[href*="info_village"], #contentContainer a[href*="info_village"]').each(function() {
                var href = $(this).attr('href') || '';
                var idM  = href.match(/id=(\d+)/);
                if (!idM) return;
                var coord = ($(this).text().trim().match(/\d{1,3}\|\d{1,3}/) || [])[0];
                if (!coord) return;
                var id = +idM[1];
                if (!villages.some(function(v){ return v.id === id; }))
                    villages.push({ id: id, coord: coord });
            });
        }
        return villages;
    }

    // ─── Calcul du train ──────────────────────────────────────────────────────

    function buildTrain(opts) {
        // opts: { target, nobleVillage, nukeVillage, nukeUnit, landingMs, nobleGapSec, nukeLeadSec, sigilPct }
        // landingMs = arrivée du NUKE (c'est ce que l'utilisateur saisit).
        // Noble 1 arrive nukeLeadSec après, puis un noble toutes les nobleGapSec.
        var now     = getServerTime().getTime();
        var rows    = [];
        var nobleSpeed = UNIT_SPEEDS['snob'] || 35;
        var distNob = calcDist(opts.nobleVillage.coord, opts.target.coord);
        var nobTrv  = travelMsFor(distNob, nobleSpeed, opts.sigilPct);
        var firstNobleMs = opts.landingMs + Math.round(opts.nukeLeadSec * 1000);

        for (var i = 0; i < 4; i++) {
            var arrMs    = firstNobleMs + Math.round(i * opts.nobleGapSec * 1000);
            var launchMs = arrMs - nobTrv;
            rows.push({
                label:    tt('noble')+' '+(i+1),
                from:     opts.nobleVillage,
                target:   opts.target,
                dist:     distNob,
                unit:     'snob',
                launchMs: launchMs,
                arrivalMs: arrMs,
                isNuke:   false,
            });
        }

        // Nuke : arrive à l'heure saisie. Sa vitesse = celle de son unité la plus lente
        // (bélier par défaut : un nuke avec béliers voyage à la vitesse des béliers).
        if (opts.nukeVillage) {
            var nukeUnit  = opts.nukeUnit || 'ram';
            var nukeSpeed = UNIT_SPEEDS[nukeUnit] || 30;
            var distNuke  = calcDist(opts.nukeVillage.coord, opts.target.coord);
            var nukeTrv   = travelMsFor(distNuke, nukeSpeed, opts.sigilPct);
            var nukeArrMs = opts.landingMs;
            rows.unshift({
                label:    tt('nuke'),
                from:     opts.nukeVillage,
                target:   opts.target,
                dist:     distNuke,
                unit:     nukeUnit,
                launchMs: nukeArrMs - nukeTrv,
                arrivalMs: nukeArrMs,
                isNuke:   true,
            });
        }

        // Filtre les envois déjà passés
        return rows.filter(function(r){ return r.launchMs > now; });
    }

    // ─── Rendu ────────────────────────────────────────────────────────────────

    var myVillages = [];
    var targetVillages = [];

    function renderTable(rows) {
        var now    = getServerTime().getTime();
        var $tbody = $('#np-tbody').empty();

        if (!rows.length) {
            $tbody.append('<tr><td colspan="6" style="text-align:center;padding:8px;color:#c0392b;">'+tt('pastTime')+'</td></tr>');
            return;
        }

        rows.forEach(function(row) {
            var parts  = row.target.coord.split('|');
            var sitter = game_data.player.sitter > 0 ? 't='+game_data.player.id+'&' : '';
            var url    = '/game.php?'+sitter+'village='+row.from.id+'&screen=place&x='+parts[0]+'&y='+parts[1];
            var bg     = row.isNuke ? '#f9e0e0' : '#e8f4f8';
            var rem    = secondsToHms((row.launchMs - now) / 1000);

            $tbody.append(
                '<tr style="background:'+bg+';">'
                +'<td style="padding:5px;font-weight:bold;white-space:nowrap;">'+row.label+'</td>'
                +'<td style="padding:5px;">'+escapeHtml(row.from.name)+' ('+row.from.coord+')</td>'
                +'<td style="padding:5px;text-align:center;">'+row.target.coord+'</td>'
                +'<td style="padding:5px;text-align:center;">'+row.dist.toFixed(2)+'</td>'
                +'<td style="padding:5px;text-align:center;font-weight:600;">'+formatDateTime(new Date(row.launchMs), true)+'</td>'
                +'<td style="padding:5px;text-align:center;"><span class="np-timer" data-ms="'+row.launchMs+'">'+rem+'</span></td>'
                +'<td style="padding:5px;text-align:center;"><a href="'+url+'" target="_blank" class="btn btn-confirm-yes" style="padding:2px 8px;">'+tt('send')+'</a></td>'
                +'<td style="padding:5px;text-align:center;font-size:10px;color:#7f8c8d;">'+formatDateTime(new Date(row.arrivalMs), true)+'</td>'
                +'</tr>'
            );
        });

        clearInterval(window._npTick);
        window._npTick = setInterval(function() {
            var n = getServerTime().getTime();
            $('.np-timer').each(function() {
                var sec = (+$(this).data('ms') - n) / 1000;
                $(this).text(sec <= 0 ? '00:00:00' : secondsToHms(sec));
                if (sec <= 0) $(this).closest('tr').css('opacity','0.4');
            });
        }, 1000);

        $('#np-results').show();
    }

    function buildUI(groups) {
        var savedGroup = localStorage.getItem(LS_PREFIX+'_group') || 0;
        var savedSigil = localStorage.getItem(LS_PREFIX+'_sigil') || '0';
        var savedGap   = localStorage.getItem(LS_PREFIX+'_gap') || '0.3';
        var savedLead  = localStorage.getItem(LS_PREFIX+'_lead') || '120';
        var savedNukeUnit = localStorage.getItem(LS_PREFIX+'_nukeUnit') || 'ram';
        var serverNow  = formatDateTime(getServerTime());

        var targetOpts = targetVillages.map(function(v) {
            return '<option value="'+v.id+'" data-coord="'+v.coord+'">'+v.coord+'</option>';
        }).join('');

        var myOpts = myVillages.map(function(v) {
            return '<option value="'+v.id+'" data-coord="'+v.coord+'">'+escapeHtml(v.name)+' ('+v.coord+')</option>';
        }).join('');

        var groupOpts = '';
        (groups.result || []).forEach(function(g) {
            if (g.type === 'separator') return;
            groupOpts += '<option value="'+g.group_id+'"'+(g.group_id==savedGroup?' selected':'')+'>'+escapeHtml(g.name)+'</option>';
        });

        var iS = 'width:100%;padding:5px 10px;border:1px solid #000;font-size:14px;';

        var html = '<div id="np-block" style="background:#f4e4bc;border:1px solid #603000;padding:12px;margin-bottom:15px;box-sizing:border-box;">'
            + '<h2 style="margin:0 0 10px;font-size:14px;color:#3d2b00;">'+tt('title')+'</h2>'

            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
                + '<div><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('targetVill')+'</label>'
                    + '<select id="np-target" style="'+iS+'"><option value="">— '+tt('selectTarget')+' —</option>'+targetOpts+'</select></div>'
                + '<div><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('myGroup')+'</label>'
                    + '<select id="np-group" style="'+iS+'">'+groupOpts+'</select></div>'
            + '</div>'

            + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">'
                + '<div><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('nobleVill')+'</label>'
                    + '<select id="np-noble-vill" style="'+iS+'"><option value="">— '+tt('selectNoble')+' —</option>'+myOpts+'</select></div>'
                + '<div><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('nukeVill')+' <span style="font-weight:normal;font-size:11px;">'+tt('optional')+'</span></label>'
                    + '<select id="np-nuke-vill" style="'+iS+'"><option value="">'+tt('sameAsNoble')+'</option>'+myOpts+'</select></div>'
            + '</div>'
            + '<div style="margin-bottom:10px;"><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('nukeUnit')+'</label>'
                + '<select id="np-nuke-unit" style="'+iS+'">'
                + ['ram','catapult','axe','light'].filter(function(u){ return !game_data.units || game_data.units.indexOf(u) >= 0; }).map(function(u) {
                    return '<option value="'+u+'"'+(u===savedNukeUnit?' selected':'')+'>'+u+' ('+(UNIT_SPEEDS[u]||'?')+' min/case)</option>';
                }).join('')
                + '</select></div>'

            + '<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;margin-bottom:10px;">'
                + '<div><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('landingTime')+'</label>'
                    + '<input id="np-landing" type="text" value="'+serverNow+'" style="'+iS+'"></div>'
                + '<div><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('nobleGap')+'</label>'
                    + '<input id="np-gap" type="text" value="'+savedGap+'" style="'+iS+'"></div>'
                + '<div><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('nukeLead')+'</label>'
                    + '<input id="np-lead" type="text" value="'+savedLead+'" style="'+iS+'"></div>'
                + '<div><label style="font-weight:bold;display:block;margin-bottom:4px;">'+tt('sigil')+'</label>'
                    + '<input id="np-sigil" type="text" value="'+savedSigil+'" style="'+iS+'"></div>'
            + '</div>'

            + '<div style="display:flex;gap:8px;margin-bottom:10px;">'
                + '<a href="javascript:void(0);" id="np-calculate" class="btn btn-confirm-yes" style="padding:4px 12px;">'+tt('calculate')+'</a>'
                + ' <a href="javascript:void(0);" id="np-export-bb" class="btn" style="padding:4px 12px;">'+tt('exportBB')+'</a>'
            + '</div>'

            + '<div id="np-results" style="display:none;overflow-x:auto;">'
                + '<table class="vis" width="100%" style="border-collapse:separate;border-spacing:2px;">'
                + '<thead><tr style="background:#c8a96e;">'
                    + '<th style="padding:5px;text-align:left;"></th>'
                    + '<th style="padding:5px;text-align:left;">'+tt('nobleVill')+'</th>'
                    + '<th style="padding:5px;">'+tt('target')+'</th>'
                    + '<th style="padding:5px;">'+tt('distance')+'</th>'
                    + '<th style="padding:5px;">'+tt('launchTime')+'</th>'
                    + '<th style="padding:5px;">'+tt('sendIn')+'</th>'
                    + '<th style="padding:5px;">'+tt('send')+'</th>'
                    + '<th style="padding:5px;font-size:11px;">'+tt('arrival')+'</th>'
                + '</tr></thead>'
                + '<tbody id="np-tbody"></tbody>'
                + '</table>'
            + '</div>'

            + '</div>';

        if ($('#np-block').length === 0)
            $('#contentContainer, #content_value').first().prepend(html);

        // Quand le groupe change → recharge mes villages
        $('#np-group').off('change').on('change', function() {
            fetchMyVillages($(this).val()).then(function(list) {
                myVillages = list;
                var opts = myVillages.map(function(v) {
                    return '<option value="'+v.id+'" data-coord="'+v.coord+'">'+escapeHtml(v.name)+' ('+v.coord+')</option>';
                }).join('');
                $('#np-noble-vill, #np-nuke-vill').find('option:not(:first)').remove().end().append(opts);
            });
        });

        $('#np-calculate').off('click').on('click', function(e) {
            e.preventDefault();
            var targetId  = $('#np-target').val();
            var nobleId   = $('#np-noble-vill').val();
            var nukeId    = $('#np-nuke-vill').val();
            var landStr   = $('#np-landing').val().trim();
            var gap       = numOr($('#np-gap').val(), 0.3);
            var lead      = numOr($('#np-lead').val(), 120);
            var sigilPct  = numOr($('#np-sigil').val(), 0);
            var nukeUnit  = $('#np-nuke-unit').val() || 'ram';

            if (!targetId) { UI.ErrorMessage(tt('selectTarget')); return; }
            if (!nobleId)  { UI.ErrorMessage(tt('selectNoble'));  return; }
            var landing = parseLandingTime(landStr);
            if (isNaN(landing.getTime())) { UI.ErrorMessage(tt('invalidDate'), 4000); return; }

            localStorage.setItem(LS_PREFIX+'_group', $('#np-group').val());
            localStorage.setItem(LS_PREFIX+'_sigil', sigilPct);
            localStorage.setItem(LS_PREFIX+'_gap',   gap);
            localStorage.setItem(LS_PREFIX+'_lead',  lead);
            localStorage.setItem(LS_PREFIX+'_nukeUnit', nukeUnit);

            var target      = targetVillages.find(function(v){ return v.id === +targetId; });
            var nobleVill   = myVillages.find(function(v){ return v.id === +nobleId; });
            var nukeVill    = nukeId ? myVillages.find(function(v){ return v.id === +nukeId; }) : nobleVill;
            var landingMs   = landing.getTime();
            if (!target || !nobleVill) { UI.ErrorMessage(tt('missing')); return; }

            var rows = buildTrain({
                target:       target,
                nobleVillage: nobleVill,
                nukeVillage:  nukeVill,
                nukeUnit:     nukeUnit,
                landingMs:    landingMs,
                nobleGapSec:  gap,
                nukeLeadSec:  lead,
                sigilPct:     sigilPct,
            });

            renderTable(rows);
            window._npRows = rows;
        });

        $('#np-export-bb').off('click').on('click', function(e) {
            e.preventDefault();
            if (!window._npRows || !window._npRows.length) { UI.ErrorMessage(tt('nothing')); return; }
            var bb = '[b]Noble Planner[/b]\n';
            window._npRows.forEach(function(row) {
                var parts  = row.target.coord.split('|');
                var sitter = game_data.player.sitter > 0 ? 't='+game_data.player.id+'&' : '';
                var url    = window.location.origin+'/game.php?'+sitter+'village='+row.from.id+'&screen=place&x='+parts[0]+'&y='+parts[1];
                bb += '[*] '+row.label+' | '+row.from.name+' → '+row.target.coord+' | '+tt('launchTime')+' : '+formatDateTime(new Date(row.launchMs), true)+' | [url='+url+']'+tt('send')+'[/url]\n';
            });
            Dialog.show('np_bb', '<div style="width:420px;"><textarea readonly style="width:100%;height:140px;resize:none;">'+escapeHtml(bb)+'</textarea></div>');
            setTimeout(function(){ $('#np_bb textarea').select(); document.execCommand('copy'); UI.SuccessMessage(tt('copied')); }, 100);
        });
    }

    // ─── Point d'entrée ──────────────────────────────────────────────────────

    NoblePlanner.init = function() {
        if (!game_data.features.Premium.active) { UI.ErrorMessage(tt('premium')); return; }
        var params   = new URL(window.location.href).searchParams;
        var screen   = params.get('screen');
        var targetId = params.get('id');
        if (screen !== 'info_player') { UI.ErrorMessage(tt('wrongScreen'), 5000); return; }
        if (targetId && +targetId === +game_data.player.id) { UI.ErrorMessage(tt('ownProfile'), 5000); return; }

        targetVillages = fetchTargetVillages();
        if (!targetVillages.length) { UI.ErrorMessage(tt('noTargets'), 5000); return; }

        var savedGroup = localStorage.getItem(LS_PREFIX+'_group') || 0;
        $.when(fetchUnitInfo(), fetchGroups()).then(function() {
            var groupData = arguments[1][0];
            fetchMyVillages(savedGroup).then(function(list) {
                myVillages = list;
                buildUI(groupData);
            }).fail(function(){ UI.ErrorMessage(tt('fetchError')); });
        }, function(){ UI.ErrorMessage(tt('fetchError')); });
    };

})(jQuery);

NoblePlanner.init();
