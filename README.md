# Bieżnia ZIPRO Sigma

Samodzielna aplikacja treningowa dla bieżni.

## Uruchomienie

Uruchom `START_BIEZNIA.bat`. Skrypt startuje lokalny serwer i otwiera aplikację pod `http://127.0.0.1:8765/index.html`.

Bluetooth działa tylko przez `http://127.0.0.1` albo HTTPS. Przy bezpośrednim otwarciu `index.html` jako `file://` przeglądarka zablokuje Web Bluetooth.

## Funkcje

- timer treningu z pauzą i resetem,
- ustawianie prędkości oraz nachylenia,
- szybkie cele 20, 30, 45 i 60 minut,
- statystyki dystansu, kalorii, tempa i pozostałego czasu,
- wybór lokalnego pliku muzyki,
- wybór lokalnego pliku wideo,
- wklejenie linku YouTube jako wideo treningowego,
- gotowe trasy: las, góry i interwały,
- własny program z odcinkami: czas, prędkość i nachylenie,
- Bluetooth FTMS: połączenie z bieżnią, diagnostyka i opcjonalne wysyłanie prędkości/nachylenia,
- zdjęcia i parametry modelu ZIPRO Sigma.

Sterowanie FTMS jest domyślnie wyłączone. Włącz je tylko po połączeniu z właściwą bieżnią i gdy stoisz bezpiecznie na urządzeniu.
