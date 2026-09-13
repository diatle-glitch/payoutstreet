(function () {
  const list = document.getElementById("list");
  const pins = document.getElementById("pins");
  if (!list) return;
  const places = [
    { id: "northrail", t: "38%", l: "18%" },
    { id: "riseblock", t: "32%", l: "38%" },
    { id: "cliffside", t: "28%", l: "52%" },
    { id: "aeroledger", t: "44%", l: "62%" },
    { id: "cfmo", t: "36%", l: "74%" },
    { id: "lot9", t: "58%", l: "30%" }
  ];
  PS.FIRMS.forEach((f) => {
    const row = document.createElement("div");
    row.className = "bay";
    row.innerHTML = `<span class="id">${f.plot}</span>
      <div><div class="name">${f.name}</div><div class="meta">${f.level ? PS.EVIDENCE[f.level].short : "OPEN"} · ${f.tag}</div></div>
      <div class="vol">${f.vacant ? "empty" : PS.money(f.volume)}<div class="meta">${f.count || 0} crates</div></div>`;
    row.onclick = () => location.href = "manifest.html#" + f.id;
    list.appendChild(row);
  });
  places.forEach((p) => {
    const f = PS.FIRMS.find((x) => x.id === p.id);
    if (!f) return;
    const el = document.createElement("a");
    el.className = "pin";
    el.href = "manifest.html#" + f.id;
    el.style.top = p.t;
    el.style.left = p.l;
    el.innerHTML = `<i></i><b>${f.name}</b><span>${f.vacant ? "open bay" : PS.money(f.volume) + " · " + (f.level ? PS.EVIDENCE[f.level].short : "")}</span>`;
    pins.appendChild(el);
  });
  const utc = document.getElementById("utc");
  if (utc) {
    const tick = () => (utc.textContent = new Date().toISOString().slice(11, 19) + " UTC");
    tick();
    setInterval(tick, 1000);
  }
})();
