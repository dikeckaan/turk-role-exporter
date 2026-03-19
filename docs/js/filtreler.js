import { puanHesapla, isDijital } from "./utils.js";

export function filtrele(roleler, filtreler, cihazProfil) {
  let sonuc = [...roleler];

  if (filtreler.sadeceAktif) {
    sonuc = sonuc.filter((role) => role.durum === true);
  }

  if (filtreler.sadeceRuhsatli) {
    sonuc = sonuc.filter((role) => role.ruhsat === true);
  }

  if (filtreler.bantlar && filtreler.bantlar.length > 0) {
    const gecerliBantlar = filtreler.bantlar.filter((b) =>
      cihazProfil.bantlar.includes(b)
    );
    if (gecerliBantlar.length > 0) {
      sonuc = sonuc.filter((role) => gecerliBantlar.includes(role.bant));
    }
  }

  // Cihaz mod kısıtlaması: analog cihaz → dijital röleler hariç
  const cihazDijitalDestekli = cihazProfil.modlar.includes("Dijital");
  const cihazAnalogDestekli = cihazProfil.modlar.includes("Analog");

  if (filtreler.mod === "sadece-analog" || (!cihazDijitalDestekli && cihazAnalogDestekli)) {
    // Analog-only device OR explicitly selected analog-only
    sonuc = sonuc.filter(
      (role) => role.digital === 0 || role.digital === null || !role.digital
    );
  } else if (filtreler.mod === "sadece-dijital") {
    sonuc = sonuc.filter(isDijital);
  }
  // "hepsi" ve "dijital-oncelikli": cihaz her iki modu destekliyorsa filtreleme yok

  if (filtreler.taBolgeleri && filtreler.taBolgeleri.length > 0) {
    sonuc = sonuc.filter((role) =>
      filtreler.taBolgeleri.includes(role.tabolge)
    );
  }

  if (filtreler.sehirler && filtreler.sehirler.length > 0) {
    sonuc = sonuc.filter((role) =>
      filtreler.sehirler.includes(role.sehir)
    );
  }

  if (filtreler.ilceler && filtreler.ilceler.length > 0) {
    sonuc = sonuc.filter((role) =>
      !role.ilce || filtreler.ilceler.includes(role.ilce)
    );
  }

  if (filtreler.dusukPuanGizle) {
    sonuc = sonuc.filter((role) => puanHesapla(role) >= 40);
  }

  return sonuc;
}

export function benzersizSehirler(roleler) {
  const sehirler = roleler
    .map((role) => role.sehir)
    .filter((sehir) => !!sehir);
  const tekil = [...new Set(sehirler)];
  return tekil.sort((a, b) => a.localeCompare(b, "tr"));
}

export function benzersizIlceler(roleler, seciliSehirler) {
  let kaynak = roleler;
  if (seciliSehirler && seciliSehirler.length > 0) {
    kaynak = roleler.filter((role) => seciliSehirler.includes(role.sehir));
  }
  const ilceler = kaynak
    .map((role) => role.ilce)
    .filter((ilce) => !!ilce && ilce !== null);
  const tekil = [...new Set(ilceler)];
  return tekil.sort((a, b) => a.localeCompare(b, "tr"));
}

export function benzersizTaBolgeleri(roleler) {
  const bolge = roleler
    .map((role) => role.tabolge)
    .filter((tabolge) => !!tabolge);
  const tekil = [...new Set(bolge)];
  return tekil.sort((a, b) => a.localeCompare(b, "tr"));
}
