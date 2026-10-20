(function(){
  var $ = function(id){ return document.getElementById(id); };
  var ATTRS = [
    {k:'fisico',   label:'Físico',                  hint:'Fuerza y choque',               lines:['Físico']},
    {k:'tiro',     label:'Tiro al Arco',            hint:'Puntería y potencia',           lines:['Tiro al','Arco']},
    {k:'pase',     label:'Pase',                    hint:'Precisión y alcance',           lines:['Pase']},
    {k:'energia',  label:'Energía',                 hint:'Aguante los 60 minutos',        lines:['Energía']},
    {k:'velocidad',label:'Velocidad',               hint:'Arranque y carrera',            lines:['Velocidad']},
    {k:'juego',    label:'Entendimiento del juego', hint:'Ubicación y lectura de jugada', lines:['Entendimiento','del juego']}
  ];
  var SHORT = {Arquero:'ARQ', Defensor:'DEF', Volante:'VOL', Delantero:'DEL'};

  var me = { num:'', name:'', x:null, y:null, attrs:{} };
  ATTRS.forEach(function(a){ me.attrs[a.k] = 5; });
  var saved = false, step = 1, busy = false, hydrated = false;
  var roster = [];
  var db = null, user = null, uid = null, canWrite = true;

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function calc(attrs){
    var s = 0; ATTRS.forEach(function(a){ s += Number(attrs[a.k]) || 0; });
    return Math.round(s / ATTRS.length * 10);
  }
  function zoneOf(x, y){
    var t = (y - 12) / 396, zone;
    if (t < 0.27) zone = 'Delantero';
    else if (t < 0.52) zone = 'Volante';
    else if (t < 0.85) zone = 'Defensor';
    else zone = 'Arquero';
    var side = zone === 'Arquero' ? '' : (x < 100 ? 'Izquierda' : (x > 200 ? 'Derecha' : 'Centro'));
    return {zone:zone, side:side};
  }
  function posLabel(p){ return p.zone + (p.side ? ' · ' + p.side : ''); }

  /* ---------- Cancha ---------- */
  var grass = $('grass'), pitch = $('pitch'), pin = $('pin');
  (function(){
    var h = 396 / 7, out = '';
    for (var i = 0; i < 7; i++){
      out += '<rect x="12" y="' + (12 + i*h).toFixed(2) + '" width="276" height="' + h.toFixed(2) + '" fill="' + (i%2 ? 'var(--grass-b)' : 'var(--grass-a)') + '"/>';
    }
    grass.innerHTML = out;
  })();

  function renderPitch(){
    if (me.x == null){ pin.hidden = true; }
    else {
      pin.hidden = false;
      pin.setAttribute('transform', 'translate(' + me.x.toFixed(1) + ' ' + me.y.toFixed(1) + ')');
      $('pinNum').textContent = me.num || '';
    }
    $('posText').textContent = me.x == null ? 'Tocá la cancha' : posLabel(zoneOf(me.x, me.y));
    var g = '';
    roster.forEach(function(p){
      if (p.id === uid || typeof p.x !== 'number') return;
      g += '<g transform="translate(' + p.x + ' ' + p.y + ')" opacity=".75"><circle r="9" fill="var(--field)" stroke="var(--chalk)" stroke-width="1.5"/><text y="4" text-anchor="middle" font-size="11" font-weight="700" fill="var(--ink)" style="font-family:var(--font-display)">' + (Number(p.num) || '') + '</text></g>';
    });
    $('others').innerHTML = g;
  }
  function pitchPoint(ev){
    var r = pitch.getBoundingClientRect();
    return {
      x: clamp((ev.clientX - r.left) / r.width * 300, 18, 282),
      y: clamp((ev.clientY - r.top) / r.height * 420, 18, 402)
    };
  }
  var dragging = false;
  pitch.addEventListener('pointerdown', function(ev){
    dragging = true;
    try{ pitch.setPointerCapture(ev.pointerId); }catch(e){}
    var p = pitchPoint(ev); me.x = p.x; me.y = p.y; renderPitch();
  });
  pitch.addEventListener('pointermove', function(ev){
    if (!dragging) return;
    var p = pitchPoint(ev); me.x = p.x; me.y = p.y; renderPitch();
  });
  function endDrag(){ dragging = false; }
  pitch.addEventListener('pointerup', endDrag);
  pitch.addEventListener('pointercancel', endDrag);
  pitch.addEventListener('keydown', function(ev){
    var d = {ArrowLeft:[-10,0], ArrowRight:[10,0], ArrowUp:[0,-10], ArrowDown:[0,10]}[ev.key];
    if (!d) return;
    ev.preventDefault();
    if (me.x == null){ me.x = 150; me.y = 300; }
    me.x = clamp(me.x + d[0], 18, 282); me.y = clamp(me.y + d[1], 18, 402);
    renderPitch();
  });

  /* ---------- Formulario ---------- */
  $('num').addEventListener('input', function(e){
    var v = e.target.value.replace(/\D/g,'').slice(0,2);
    me.num = v; $('pinNum').textContent = v;
  });
  $('name').addEventListener('input', function(e){ me.name = e.target.value; });

  function validateReg(){
    var n = parseInt(me.num, 10);
    if (!(n >= 1 && n <= 99)) return 'Ingresá un número de jugador entre 1 y 99.';
    if (me.name.trim().length < 2) return 'Escribí tu nombre (al menos 2 letras).';
    if (me.x == null) return 'Tocá la cancha para ubicar tu posición.';
    var clash = roster.filter(function(p){ return p.id !== uid && Number(p.num) === n; })[0];
    if (clash) return 'El ' + n + ' ya lo tiene ' + clash.name + '. Elegí otro número.';
    return '';
  }

  /* ---------- Atributos y hexágono ---------- */
  var attrsEl = $('attrs');
  ATTRS.forEach(function(a){
    var li = document.createElement('li'); li.className = 'attr';
    li.innerHTML =
      '<div class="row"><label for="r_' + a.k + '">' + a.label + '</label><output id="o_' + a.k + '" for="r_' + a.k + '">5</output></div>' +
      '<small>' + a.hint + '</small>' +
      '<input type="range" id="r_' + a.k + '" min="1" max="10" step="1" value="5">';
    attrsEl.appendChild(li);
    li.querySelector('input').addEventListener('input', function(e){
      me.attrs[a.k] = Number(e.target.value);
      $('o_' + a.k).textContent = e.target.value;
      renderHex(false);
    });
  });

  var CX = 180, CY = 160, R = 92;
  function ang(i){ return (-90 + 60*i) * Math.PI / 180; }
  function pt(i, r){ return [CX + r*Math.cos(ang(i)), CY + r*Math.sin(ang(i))]; }
  function poly(r){
    var s = [];
    for (var i = 0; i < 6; i++){ var p = pt(i, r); s.push(p[0].toFixed(1) + ',' + p[1].toFixed(1)); }
    return s.join(' ');
  }
  function renderHex(unfold){
    var out = '';
    [2,4,6,8,10].forEach(function(l){
      out += '<polygon points="' + poly(R*l/10) + '" fill="' + (l === 10 ? 'var(--field)' : 'none') + '" stroke="var(--rule)" stroke-width="' + (l === 10 ? 1.5 : 1) + '"/>';
    });
    for (var i = 0; i < 6; i++){
      var e = pt(i, R);
      out += '<line x1="' + CX + '" y1="' + CY + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" stroke="var(--rule)" stroke-width="1"/>';
    }
    var dp = [], dots = '';
    ATTRS.forEach(function(a, i){
      var p = pt(i, R * me.attrs[a.k] / 10);
      dp.push(p[0].toFixed(1) + ',' + p[1].toFixed(1));
      dots += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4" fill="var(--accent)" stroke="var(--surface)" stroke-width="1.5"/>';
    });
    var data = '<polygon points="' + dp.join(' ') + '" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>' + dots;
    var labels = '';
    ATTRS.forEach(function(a, i){
      var c = Math.cos(ang(i)), s = Math.sin(ang(i));
      var lx = CX + (R + 16) * c, ly = CY + (R + 16) * s;
      var anchor = c > 0.3 ? 'start' : (c < -0.3 ? 'end' : 'middle');
      var n = a.lines.length + 1, lh = 15, y0;
      if (s < -0.7) y0 = ly - lh*(n-1) - 2;
      else if (s > 0.7) y0 = ly + 14;
      else y0 = ly - lh*(n-1)/2 + 4;
      var t = '<text text-anchor="' + anchor + '">';
      a.lines.forEach(function(L, j){
        t += '<tspan class="lbl-name" x="' + lx.toFixed(1) + '" y="' + (y0 + lh*j).toFixed(1) + '">' + L + '</tspan>';
      });
      t += '<tspan class="lbl-val" x="' + lx.toFixed(1) + '" y="' + (y0 + lh*a.lines.length + 2).toFixed(1) + '">' + me.attrs[a.k] + '</tspan></text>';
      labels += t;
    });
    var hex = $('hex');
    hex.innerHTML = out + '<g class="dataG" id="dataG">' + data + '</g>' + labels;
    if (unfold){
      var g = $('dataG'); g.classList.remove('unfold'); void g.getBoundingClientRect(); g.classList.add('unfold');
    }
    var sc = calc(me.attrs);
    $('finalScore').textContent = sc;
    hex.setAttribute('aria-label', 'Gráfico hexagonal. ' + ATTRS.map(function(a){ return a.label + ' ' + me.attrs[a.k]; }).join(', ') + '. Puntaje final ' + sc + '.');
  }

  /* ---------- Plantel ---------- */
  function renderRoster(){
    var list = roster.slice().sort(function(a, b){ return (b.score||0) - (a.score||0) || (a.num||0) - (b.num||0); });
    ['rosterSide','rosterMain'].forEach(function(id){
      var ul = $(id); ul.innerHTML = '';
      if (!list.length){
        var p = document.createElement('li'); p.style.display = 'block'; p.style.border = '0';
        p.innerHTML = '<p class="empty">Todavía no se anotó nadie. Cuando los jugadores completen su ficha, aparecen acá ordenados por puntaje.</p>';
        ul.appendChild(p); return;
      }
      list.forEach(function(p){
        var li = document.createElement('li'); if (p.id === uid) li.className = 'me';
        var badge = document.createElement('div'); badge.className = 'badge'; badge.textContent = p.num;
        var nm = document.createElement('div'); nm.className = 'nm';
        var b = document.createElement('b'); b.textContent = p.name + (p.id === uid ? ' (vos)' : '');
        var sp = document.createElement('span'); sp.textContent = (p.zone ? posLabel(p) : 'Sin posición');
        nm.appendChild(b); nm.appendChild(sp);
        var sc = document.createElement('div'); sc.className = 'sc';
        var st = document.createElement('strong'); st.textContent = p.score == null ? '–' : p.score;
        var bar = document.createElement('div'); bar.className = 'bar';
        var fill = document.createElement('i'); fill.style.width = clamp(p.score || 0, 0, 100) + '%';
        bar.appendChild(fill); sc.appendChild(st); sc.appendChild(bar);
        li.appendChild(badge); li.appendChild(nm); li.appendChild(sc);
        ul.appendChild(li);
      });
    });
    var txt = list.length + (list.length === 1 ? ' jugador' : ' jugadores');
    $('countSide').textContent = txt; $('countMain').textContent = txt;
  }

  /* ---------- Navegación ---------- */
  function go(n){
    if (n === 2 && !saved) n = 1;
    step = n;
    [1,2,3].forEach(function(i){
      $('v' + i).hidden = (i !== n);
      var b = $('st' + i);
      if (i === n) b.setAttribute('aria-current','step'); else b.removeAttribute('aria-current');
    });
    $('st2').disabled = !saved;
    if (n === 2){
      var z = zoneOf(me.x, me.y);
      $('chipNum').textContent = me.num; $('chipName').textContent = me.name.trim(); $('chipPos').textContent = posLabel(z);
      renderHex(true);
    }
    if (n === 1) renderPitch();
  }
  [1,2,3].forEach(function(i){ $('st' + i).addEventListener('click', function(){ go(i); }); });
  $('editBtn').addEventListener('click', function(){ go(1); });

  var toastTimer;
  function toast(msg){
    var t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.hidden = true; }, 2600);
  }
  function notice(msg){ var n = $('notice'); n.textContent = msg; n.hidden = !msg; }

  /* ---------- Guardado ---------- */
  async function persist(){
    var z = zoneOf(me.x, me.y);
    var doc = {
      num: parseInt(me.num, 10), name: me.name.trim(),
      x: Math.round(me.x), y: Math.round(me.y), zone: z.zone, side: z.side,
      attrs: Object.assign({}, me.attrs), score: calc(me.attrs), updatedAt: Date.now()
    };
    if (db && uid){
      await db.collection('players').doc(uid).set(doc);
    } else {
      roster = [Object.assign({id:'local'}, doc)];
      uid = uid || 'local';
      renderRoster(); renderPitch();
    }
  }
  async function guarded(fn, errEl){
    if (busy) return;
    busy = true; errEl.textContent = '';
    try{ await fn(); }
    catch(e){
      errEl.textContent = 'No se pudo guardar. Revisá tu conexión o pedí que te den acceso de colaborador.';
    }
    busy = false;
  }
  $('regForm').addEventListener('submit', function(ev){
    ev.preventDefault();
    var msg = validateReg();
    if (msg){ $('err').textContent = msg; return; }
    var btn = $('goBtn'); btn.disabled = true;
    guarded(async function(){
      await persist(); saved = true; go(2);
    }, $('err')).then(function(){ btn.disabled = false; });
  });
  $('saveBtn').addEventListener('click', function(){
    var btn = $('saveBtn'); btn.disabled = true;
    guarded(async function(){
      await persist(); toast('Ficha guardada'); go(3);
    }, $('err2')).then(function(){ btn.disabled = false; });
  });

  /* ---------- Datos compartidos ---------- */
  function applyMine(p){
    me.num = String(p.num); me.name = p.name; me.x = p.x; me.y = p.y;
    ATTRS.forEach(function(a){ me.attrs[a.k] = (p.attrs && p.attrs[a.k]) || 5; });
    $('num').value = me.num; $('name').value = me.name;
    ATTRS.forEach(function(a){ $('r_' + a.k).value = me.attrs[a.k]; $('o_' + a.k).textContent = me.attrs[a.k]; });
  }
  function onPlayers(snap){
    roster = snap.docs.map(function(d){ return Object.assign({id:d.id}, d.data()); });
    var mine = roster.filter(function(p){ return p.id === uid; })[0];
    if (!hydrated){
      hydrated = true;
      if (mine && typeof mine.x === 'number'){ applyMine(mine); saved = true; go(2); }
    }
    renderRoster();
    if (step === 1) renderPitch();
  }
  async function boot(){
    try{
      if (window.claude && window.claude.use){
        db = await window.claude.use('db');
        user = await window.claude.use('user');
      }
    }catch(e){ db = null; }
    if (user){
      try{ uid = await user.id(); }catch(e){ uid = null; }
      try{ if ((await user.can('data.write')) === false) canWrite = false; }catch(e){}
    }
    if (!db || !uid){
      hydrated = true; db = null; uid = null;
      notice('Estás sin conexión al plantel compartido. Podés probar la app, pero tu ficha no se va a guardar para los demás.');
      return;
    }
    if (!canWrite) notice('Tu acceso es de solo lectura: podés ver el plantel, pero para anotarte necesitás permiso de colaborador.');
    db.collection('players').onSnapshot(onPlayers, function(){
      hydrated = true; notice('Se perdió la conexión con el plantel. Recargá la página.');
    });
  }

  renderHex(false); renderRoster(); renderPitch(); go(1);
  boot();
})();