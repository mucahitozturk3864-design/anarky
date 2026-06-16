# ANARKY DAW C-Core Teknik Raporu

GitHub Repository: https://github.com/mucahitozturk3864-design/anarky

## Projenin Amaci ve Tanimi

ANARKY DAW projesi, muzik temali bir dijital ses isleme ve album deneyimi
projesidir. Projenin web arayuzu album secimi, gorsel/medya sunumu ve
etkilesimli deneyim katmanini olustururken, projenin teknik cekirdegi `c_core`
klasorunde C dili ile gelistirilen ses motorudur. Bu cekirdek; ses kanali
olusturma, kanallari mix etme, ses efektleri uygulama, frekans filtreleme,
step sequencer ile ritim uretme, ses buffer analizleri hesaplama, album
verilerini Binary Search Tree yapisinda tutma ve islenen sesi WAV dosyasi
olarak diske yazma islevlerini yerine getirir.

Bu yonuyle proje yalnizca bir web sayfasi degildir; web katmani, C ile yazilan
ses isleme mantigini kullaniciya gosteren arayuz gorevini ustlenir. Ana odak C
dilinde algoritma, veri yapisi, pointer, dinamik bellek, moduler tasarim ve
dosya islemlerinin bir araya getirilmesidir.

## Sistem Mimarisi ve Akis Diyagrami

Sistem moduler bir C mimarisiyle tasarlanmistir. `main.c` uygulamanin test ve
calistirma merkezidir. Once album veritabani olusturulur, ardindan pad ve beat
ses kanallari heap belleginde acilir. Pad kanali basit bir sinyal ile
doldurulur, beat kanali ise `StepSequencer` yapisi tarafindan uretilen 16
adimli pattern ile olusturulur. Kanal buffer'lari filtre ve efekt modulleri ile
islenir, analyzer modulu ile teknik istatistikleri hesaplanir, mixer modulu ile
master cikisa aktarilir ve son olarak WAV writer modulu bu cikisi dosyaya
yazar. Calismanin sonunda hem ses kanallari hem de album agaci bellekten
temizlenir.

Akis:

1. Program baslatilir.
2. Albumler Binary Search Tree yapisina eklenir.
3. ID ile album arama testi yapilir.
4. Dinamik bellekten pad ve beat `AudioChannel` nesneleri olusturulur.
5. `StepSequencer` ile beat pattern'i ses buffer'ina render edilir.
6. Low-pass, high-pass ve distortion islemleri uygulanir.
7. Analyzer modulu peak, RMS, average ve zero-crossing degerlerini hesaplar.
8. Aktif kanallar mixer tarafindan master cikisa toplanir.
9. Cikis `output_test.wav` dosyasina yazilir.
10. Heap bellegi ve BST dugumleri serbest birakilir.

```text
Basla
  |
  v
Album BST kur -> Album ara
  |
  v
AudioChannel olustur -> StepSequencer ile beat uret
  |
  v
Filtre/Efekt uygula
  |
  v
Analyzer ile buffer istatistiklerini hesapla
  |
  v
Mixer ile master output hesapla
  |
  v
WAV dosyasina yaz
  |
  v
Bellek temizle
  |
  v
Bitir
```

## Teknik Detaylar ve Kod Yapisi

Projede C dilinin temel ve orta seviye yapilari aktif olarak kullanilmistir.
`types.h` dosyasinda `AudioChannel`, `VocalEffect`, `BeatStep` ve `AudioStats`
adli `struct` veri yapilari tanimlanir. `AudioChannel`, ses buffer'ina isaret
eden `float*` pointer'i, sample rate bilgisini, gain/pan degerlerini, aktiflik
durumunu ve bir sonraki kanali gosteren `next` pointer'ini icerir. Bu yapi
sayesinde ses kanallari linked list seklinde tutulur.

`channel.c` modulunde `malloc` ve `calloc` ile dinamik bellek ayrilir.
`add_channel_to_mixer` fonksiyonunda `AudioChannel**` kullanilarak listenin
basina disaridan mudahale edilebilir. Bu, pointer-to-pointer kullanimina iyi
bir ornektir. `free_all_channels` fonksiyonu ise listeyi gezerek once her
kanalin buffer'ini, sonra kanal dugumunu serbest birakir. Bu yaklasim bellek
kacagini onlemek icin gereklidir.

`sequencer.c` modulunde `StepSequencer` adli struct, C dilinde class benzeri
bir yapi olarak kullanilir. Bu yapinin icinde 16 elemanli `BeatStep` dizisi,
tempo bilgisi, sample rate ve adim sayisi tutulur. `init_step_sequencer`
fonksiyonu bu yapinin kurucu fonksiyonu gibi davranir. `set_step` fonksiyonu
tek bir adimin aktiflik, velocity ve frekans degerlerini ayarlar.
`render_step_sequence` fonksiyonu ise bu pattern'i sample buffer'ina sinus
dalgalari olarak yazar. Boylece proje sadece hazir ses gostermek yerine C
tarafinda algoritmik ses uretimi yapar.

`mixer.c`, linked list uzerindeki aktif kanallari dolasir. Her kanal icin
`for` dongusuyle sample buffer'i okunur, gain katsayisi uygulanir ve master
buffer'a eklenir. Son dongude cikis degerleri `-1.0` ile `1.0` araligina
sinirlanir. Bu islem dijital ses isleme acisindan clipping kontrolu gorevi
gormektedir.

`filters.c` dosyasinda low-pass ve high-pass filtre fonksiyonlari bulunur.
Low-pass filtrede onceki sample degeri `LowPassFilter` yapisinda saklanir. Her
yeni sample icin onceki filtrelenmis degerle mevcut deger karistirilir. Bu
yontem basit bir IIR filtre mantigini temsil eder.

`effects.c` buffer uzerinde dogrudan islem yapan efekt fonksiyonlarini icerir.
Distortion efektinde sample degeri drive katsayisiyla carpilir ve esik degerin
disina cikarsa sinirlanir. Robot voice efektinde pozitif ve negatif sample'lar
sabit seviyelere cekilerek daha keskin bir dalga formu uretilir.

`analyzer.c` dosyasi, islenen sesin teknik olarak olculebilmesini saglar.
`AudioStats` struct'i peak, RMS, average ve zero-crossing degerlerini saklar.
RMS hesabi icin sample kareleri toplanir ve ortalamasinin karekoku alinir.
Zero-crossing hesabi ise sinyalin pozitif-negatif gecislerini sayarak sesin
dalga hareketi hakkinda bilgi verir. Bu modul, projenin C tarafina sayisal
analiz ve raporlanabilir cikti kazandirir.

`album_bst.c`, Binary Search Tree veri yapisini kullanir. Albumler `album_id`
degerine gore sola veya saga yerlestirilir. Arama fonksiyonu rekursif olarak
calisir ve hedef ID bulunana kadar ilgili alt agaca iner. Bu bolum projeye ses
islemenin yaninda veri yapisi ve rekursiyon kullanimi da kazandirir.

`wav_writer.c`, dosya islemleri tarafini temsil eder. `fopen`, `fwrite` ve
`fclose` kullanilarak binary WAV dosyasi olusturulur. Float sample degerleri
once `[-1.0, 1.0]` araliginda tutulur, sonra 16-bit PCM `short` tipine
donusturulur. Bu sayede C tarafinda uretilen ses dis ortamda acilabilecek
standart bir WAV dosyasi haline gelir.

## Karsilasilan Zorluklar ve Cozumler

Gelistirme surecinde ilk zorluk, projenin web arayuzu nedeniyle bir web projesi
gibi algilanmasiydi. Bu sorun C cekirdeginin `c_core` klasorunde ayrilmasi,
modullerin header/source yapisinda duzenlenmesi, `sequencer` ve `analyzer`
gibi yeni C modullerinin eklenmesi ve web katmaninin C motorunu gorsellestiren
arayuz olarak konumlandirilmasiyla cozuldu.

Ikinci zorluk dinamik bellek yonetimiydi. Ses buffer'lari heap uzerinde
ayrildigi icin program sonunda her buffer'in ve her kanal dugumunun serbest
birakilmasi gerekti. Bunun icin `free_all_channels` fonksiyonu yazildi. Album
agaci icin de post-order mantigiyla calisan `free_album_tree` fonksiyonu
kullanildi.

Ucuncu zorluk ses sample degerlerinin guvenli aralikta tutulmasiydi. Birden
fazla kanal toplandiginda degerler dijital ses sinirlarini asabilir. Bu nedenle
mixer cikisinda clipping kontrolu yapildi ve sample degerleri `-1.0` ile `1.0`
araliginda tutuldu.

Dorduncu zorluk, C tarafinda daha proje odakli ve sinif benzeri moduller
kurmakti. C dilinde class olmadigi icin bu ihtiyac `struct` veri yapilari,
header dosyalari ve bu yapilar uzerinde calisan fonksiyonlarla cozuldu.
`StepSequencer` ve `AudioStats` bu yaklasimin iki ornegidir.

Son zorluk, C ile uretilen sesin disaridan test edilebilir bir dosyaya
donusturulmesiydi. Bu amacla WAV header yapisi tanimlandi ve islenen float
buffer 16-bit PCM formatina cevrildi. Program calistirildiginda `output_test.wav`
dosyasi olusarak C cekirdeginin somut cikti verdigi dogrulandi.

## Sonuc

ANARKY DAW, gorsel arayuzu web teknolojileriyle desteklenen ancak teknik
merkezinde C diliyle yazilmis bir ses isleme cekirdegi bulunan bir projedir.
Proje; fonksiyonlar, donguler, diziler, pointer'lar, `struct` yapilari, linked
list, Binary Search Tree, rekursiyon, step sequencer algoritmasi, ses analizi,
dinamik bellek ve dosya islemleri gibi C dersi kapsamindaki konulari tek bir
uygulama senaryosunda birlestirmektedir. Derleme testi `gcc -Wall -Wextra -O2`
ile basarili olmus ve program calisarak WAV cikti dosyasi uretmistir.

