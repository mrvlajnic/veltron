# Veltron AI Lab — dokument za medije

Veltron AI Lab je eksperimentalni AI asistent za podršku korisnicima koji je integrisan u sajt veltroncars.com. Nalazi se na stranici `/ai-lab/`, a kao manji razgovorni widget dostupan je i na osam javnih stranica sajta (početna, koncepti, proces, o nama, kontakt i ostale).

Projekat je deo Veltron Cars-a, nezavisnog studija za dizajn i istraživanje automobila iz Beograda. Veltron trenutno nema proizvodni automobil i ne prodaje automobile — bavi se dizajnom i istraživanjem koncepta, kao što su V1 SportLine i istraživanje V-Force pogona. AI Lab je nastao kao logičan sledeći korak: sajt predstavlja kompaniju i njene ideje, a asistent pomaže posetiocima da brzo dobiju odgovore na pitanja o tome.

## Zašto sam ga napravio

Ideja je jednostavna. Posetioci sajta stalno postavljaju ista pitanja: ko stoji iza kompanije, šta su pillar-i dizajna, u kom je statusu razvoj, da li postoji proizvodni automobil. Odgovori na ta pitanja već postoje na sajtu, ali ih morate pronaći samim čitanjem više stranica.

Hteo sam asistenta koji te odgovore daje odmah, u razgovoru, ali bez preterivanja. Ne želim bot koji izmišlja ili prodaje nešto što ne postoji. Zato je ceo sistem napravljen tako da asistent radi ono što mu je dozvoljeno: odgovara iz konfiguracije koju sam ručno napisao, priznaje kada ne zna, eskalira na čoveka kada treba i ne prelazi temu na ono što Veltron nije.

Drugi razlog je učenje. Želeo sam da prođem ceo tok jednog AI proizvoda — od integracije modela, preko bezbednosti, do testiranja — na nečemu što stvarno stoji javno na internetu.

## Kako funkcioniše

Sajt je statičan i hostovan na GitHub Pages-u. Asistent radi preko malog API-ja na Express backendu koji je hostovan na Render-u (`veltron-backend.onrender.com`). Backend poziva OpenRouter, servis koji omogućava pristup različitim jezičkim modelima. Trenutno se koristi `openrouter/auto`, a u praksi najčešće odgovara `google/gemini-2.5-flash`.

Vazno je naglasiti: ovo nije model koji sam trenirao niti sam napravio svoj jezički model. Koristim postojeći, javno dostupan model, i usmeravam ga pomoću konfiguracije.

Konfiguracija je JSON fajl (`support-assistant.json`, verzija 1.1.0) koji sadrži pet pravila (iskrenost, priznavanje neznanja, eskalacija, opseg tema i odbrana od prompt injekcija), sedam primera dobrih odgovora, jedanaest ručno potvrđenih činjenica o kompaniji i listu ograničenja. Asistent radi onoliko koliko mu konfiguracija dopušta. Konfiguracija je javno dostupna preko GET `/api/ai-lab/config` — smatram da treba da se vidi šta asistentu piše.

Asistent ume i da prelistava sajt uživo. Ako ga pitate šta ima na Contact stranici, on može da poziva tool koji mu vraća sadržaj te stranice i da odgovor zasniva na tome, a u meta podacima se vidi koja je stranica pregledana. Radi se samo o javno objavljenim stranicama, sa servera, uz strogu listu dozvoljenih putanja.

## Šta je trenutno urađeno

Sve što sledi je već implementirano, testirano i deploy-ovano na `veltroncars.com`.

Backend sa svim logikama — validacija unosa, ograničavanje zahteva, konfiguracija, tool za prelistavanje sajta — je na mestu. API ključ za OpenRouter nikada ne ide u browser; nalazi se samo kao promenljiva okruženja na serveru. Unos se proverava, odbacuje se HTML, a greške se ne prosleđuju detaljno ka klijentu.

Zaštita od zloupotrebe radi na dva fronta: honeypot polje (isto kao na kontakt formi) i ograničenje od 10 zahteva po minutu po IP adresi. Token CORS i bezbednosni hedleri su podešeni. Ovo su osnovne mere, ne čudesni štit — više o tome u sekciji o ograničenjima.

Na sajtu postoji lebdeći chat widget (crveni balon u uglu) na osam javnih stranica. Widget šalje informaciju o trenutnoj stranici, pa asistent zna na kojoj se stranici nalazite i odgovara u tom kontekstu. Istorija razgovora čuva se samo u sessionStorage-u browsera, do 20 poruka.

Playground stranica `/ai-lab/` prikazuje konfiguraciju, modele identiteta, primere pitanja i status asistenta. Stoji joj i eksperimentalna značka sa rezultatom poslednje provere ponašanja.

Za kvalitet postoje dva nivoa provere. Prvi je 67 automatskih testova koje pokrećem pre svake izmene — pokrivaju validaciju unosa, sigurnosne hedere, CORS, ograničenje zahteva, honeypot, dozvoljene modele, tool petlju, bezbednost putanja za prelistavanje, keš, striptizovanje HTML-a, kontekst stranice i provere da u klijentskom kodu nema innerHTML-a ni ključeva. Drugi je live eval-skripta koja asistenta prolazi kroz osam ponašanja: neizvesnost, odbijanje izmišljanja politika, tri pokušaja prompt injekcije, eskalacija, praćenje jezika i odgovor iz potvrđene činjenice. Poslednji rezultat je 8/8 (11.10.2026, `google/gemini-2.5-flash`, konfiguracija v1.1.0).

Mora se biti iskren oko ovoga: 67 testova i 8/8 prolaza ne znače da je sistem potpuno bezbedan ili da model nikada neće pogrešiti. Testovi pokrivaju ono što sam mogao da predvidim i proverim. Eval heuristike su orijentir, ne merilo istine. Ovo je eksperiment koji radi javno, ne garantovan proizvod.

## Šta još nije rešeno

Asistent nema pamćenje preko sesija — kad zatvorite tab, razgovor nestaje. Podrška za jezike zavisi od modela; na srpskom uglavnom radi, ali nije zagarantovana. Prelistavanje sajta vidi samo statične, javno objavljene stranice — ne vidi admin panel, rezervacije niti bilo šta iza login-a.

Ograničenje zahteva je u memoriji servera, pa ne skalira horizontalno ako backend poraste na više instanci. Otpor prompt injekciji je delimičan: testovi prolaze, ali model može da zabrlja na kreativne napade. I model može da pogreši — konfiguracija i tool-ovi su tu da smanje šansu, ne da je eliminišu.

Ne tvrdim da je ovo gotov proizvod spremne za naplatu. Trenutna verzija je lični eksperiment koji stoji javno.

## Planovi za budućnost

Postoji ideja da se ovaj pristup izdvoji kao sopstveni API, odvojen od trenutnog sajta. Na taj način bi asistent mogao da se uključi i u druge projekte, ne samo u Veltron Cars.

Isti pravac ide i ka dostupnosti za male internet prodavnice. Mnogim malim prodavnicama treba jednostavan asistent koji odgovara na pitanja o proizvodima i dostavi, a nemaju resurse da sami grade i održavaju ovakav sistem. Kao smernicu razmišljanja imam mesečnu cenu od oko 1,98 evra — ali to je za sada samo ideja za budući model, ne dostupna usluga. Nema još korisnika, partnera niti potvrđenog prihoda, i ne želim da stvaram utisak da ih ima. Prvo treba da rešim skaliranje, podršku i pouzdanost, pa tek onda razmišljam o naplati.

## Šta želim da naučim i postignem

Kroz ovaj projekat učim kako se jedan jezički model pretvara u nešto što liči na proizvod: kako se piše konfiguracija koja drži odgovore unutar okvira, kako se štiti API ključ, kako se testira ponašanje umesto samo kod, i gde su stvarne granice onoga što prompting može da garantuje.

Želim da od ovoga napravim nešto što stvarno koristi malim prodavnicama — jednostavno, jeftino i pouzdano. Ne preko noći i ne sa obećanjima koja ne mogu da potkrepim. Korak po korak, sa javno vidljivim napretkom, kao što je i ovaj sajt nastao.

Kontakt za medije i dodatna pitanja: [ovde uneti kontakt osobu/ime] — office@veltroncars.com
