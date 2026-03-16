import requests
import csv
import sys

def clean_turkish_chars(text):
    if not text:
        return ""
    replacements = {
        'ı': 'i', 'I': 'I', 'İ': 'I', 'i': 'i',
        'ğ': 'g', 'Ğ': 'G',
        'ü': 'u', 'Ü': 'U',
        'ş': 's', 'Ş': 'S',
        'ö': 'o', 'Ö': 'O',
        'ç': 'c', 'Ç': 'C',
        'â': 'a', 'Â': 'A',
        'î': 'i', 'Î': 'I'
    }
    for search, replace in replacements.items():
        text = text.replace(search, replace)
        
    # Sadece ASCII (A-Z, a-z, 0-9, boşluk) değerlerini tut
    return ''.join(c for c in text if c.isalnum() or c.isspace()).strip()

def fetch_and_parse_roles():
    url = "https://amatortelsizcilik.com.tr/roleler/data.json"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }

    il_plaka = {
        "adana": "01", "adiyaman": "02", "afyonkarahisar": "03", "afyon": "03", "agri": "04",
        "amasya": "05", "ankara": "06", "antalya": "07", "artvin": "08", "aydin": "09",
        "balikesir": "10", "bilecik": "11", "bingol": "12", "bitlis": "13", "bolu": "14",
        "burdur": "15", "bursa": "16", "canakkale": "17", "cankiri": "18", "corum": "19",
        "denizli": "20", "diyarbakir": "21", "edirne": "22", "elazig": "23", "erzincan": "24",
        "erzurum": "25", "eskisehir": "26", "gaziantep": "27", "giresun": "28", "gumushane": "29",
        "hakkari": "30", "hatay": "31", "iskenderun": "31", "antakya": "31", "isparta": "32", 
        "mersin": "33", "icel": "33", "istanbul": "34", "izmir": "35", "kars": "36", 
        "kastamonu": "37", "kayseri": "38", "kirklareli": "39", "kirsehir": "40", "kocaeli": "41",
        "izmit": "41", "konya": "42", "kutahya": "43", "malatya": "44", "manisa": "45", 
        "kahramanmaras": "46", "mardin": "47", "mugla": "48", "mus": "49", "nevsehir": "50", 
        "nigde": "51", "ordu": "52", "rize": "53", "sakarya": "54", "adapazari": "54", 
        "samsun": "55", "siirt": "56", "sinop": "57", "sivas": "58", "tekirdag": "59", 
        "tokat": "60", "trabzon": "61", "tunceli": "62", "sanliurfa": "63", "urfa": "63", 
        "usak": "64", "van": "65", "yozgat": "66", "zonguldak": "67", "aksaray": "68", 
        "bayburt": "69", "karaman": "70", "kirikkale": "71", "batman": "72", "sirnak": "73", 
        "bartin": "74", "ardahan": "75", "igdir": "76", "yalova": "77", "karabuk": "78", 
        "kilis": "79", "osmaniye": "80", "duzce": "81", "kıbrıs": "KKTC"
    }
    
    # Yeni CSV Başlıkları
    csv_headers = [
        "Channel Mode", "Channel Name", "RX Frequency(MHz)", "TX Frequency(MHz)", "Band Width",
        "Scan List", "Squelch", "RX Ref Frequency", "TX Ref Frequency", "TOT[s]", "TOT Rekey Delay[s]",
        "Power", "Admit Criteria", "Auto Scan", "Rx Only", "Lone Worker", "VOX", "Allow Talkaround",
        "Send GPS Info", "Receive GPS Info", "Private Call Confirmed", "Emergency Alarm Ack", 
        "Data Call Confirmed", "Allow Interrupt", "DCDM Switch", "Leader/MS", "Emergency System",
        "Contact Name", "Group List", "Color Code", "Repeater Slot", "In Call Criteria", "Privacy",
        "Privacy No.", "GPS System", "CTCSS/DCS Dec", "CTCSS/DCS Enc", "Rx Signaling System",
        "Tx Signaling System", "QT Reverse", "Non-QT/DQT Turn-off Freq", "Display PTT ID",
        "Reverse Burst/Turn-off Code", "Decode 1", "Decode 2", "Decode 3", "Decode 4",
        "Decode 5", "Decode 6", "Decode 7", "Decode 8"
    ]

    try:
        include_pmr = input("PMR ve Dijital PMR (dPMR) kanalları listeye eklensin mi? (E/H): ").strip().lower()
        active_only = input("Sadece 'Aktif' durumdaki röleler mi eklensin? (E/H): ").strip().lower()
        rx_only_all = input("PMR harici tüm röleler sadece dinleme (Rx Only) yapılsın mı? (Varsayılan: E) (E/H): ").strip().lower() or 'e'
        
        file_name_input = input("Kaydedilecek dosya adını girin (Varsayılan: roleler_programlama.csv): ").strip()
        csv_filename = file_name_input if file_name_input else "roleler_programlama.csv"
        if not csv_filename.endswith(".csv"):
            csv_filename += ".csv"
            
    except EOFError:
        include_pmr = 'e'  # Default if non-interactive
        active_only = 'e'
        rx_only_all = 'e'
        csv_filename = "roleler_programlama.csv"

    try:
        print(f"Veri çekiliyor: {url}")
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if active_only in ['e', 'evet', 'y', 'yes', '1']:
            data = [r for r in data if r.get('durum') in [True, 1, "1"]]
            print(f"Sadece aktif olan {len(data)} adet röle filtrelendi.")
        else:
            print(f"Toplam {len(data)} adet (aktif ve pasif) röle verisi bulundu.")
        
        data.sort(key=lambda x: str(x.get('sehir', '')).lower())

        with open(csv_filename, mode='w', newline='', encoding='utf-8') as file:
            # Use comma as delimiter based on the varsayilan.csv template
            writer = csv.writer(file, delimiter=',')
            writer.writerow(csv_headers)
            
            for role in data:
                # Calculate TX frequency
                rx_freq = str(role.get('frekans', '')).replace(',', '.')
                tx_freq = rx_freq 
                
                # Check for Repeater Shift
                rxtx = role.get('rxtx', '')
                bant = role.get('bant', '')
                try:
                    freq_float = float(rx_freq)
                    if bant == 'VHF' and rxtx in ['TxRx', 'Tx']:
                        tx_freq = f"{freq_float - 0.600:.5f}"
                    elif bant == 'UHF' and rxtx in ['TxRx', 'Tx']:
                        tx_freq = f"{freq_float - 7.600:.5f}"
                except ValueError:
                    pass

                # Calculate Channel Mode: Digital (1 or 2) is "2", Analog is "1" based on typical CPS
                is_digital = str(role.get('digital')) in ['1', '2']
                ch_mode = "2" if is_digital else "1"
                
                # Channel Name creation -> Maksimum 15-16 karakter, tekrarı önlemek için ID/Konum kullanılabilir.
                city_raw = clean_turkish_chars(str(role.get('sehir', ''))).lower()
                plaka = il_plaka.get(city_raw, city_raw[:5].capitalize()) # Eğer bulamazsa şehrin ilk 5 harfini koy
                
                # Rölenin konum bilgisinden ilk kelimeyi alıp plakanın yanına ekliyoruz, sonuna da bandı koyuyoruz.
                konum_raw = str(role.get('konum', '')).split()[0] if role.get('konum') else str(role.get('id', ''))
                konum = clean_turkish_chars(konum_raw.capitalize())
                ch_name = f"{plaka} {konum[:7]} {bant}".strip()[:15]

                tone = role.get('ton', '')
                ctcss_enc = tone if tone else "None"
                ctcss_dec = "None"
                
                # Default empty row template
                row = ["0"] * len(csv_headers)
                
                # Fill mapped values
                row[0] = ch_mode # Channel Mode
                row[1] = ch_name # Channel Name
                row[2] = rx_freq # RX Frequency
                row[3] = tx_freq # TX Frequency
                
                row[4] = "0" # Band Width
                row[5] = "0" # Scan List
                row[14] = "1" if rx_only_all in ['e', 'evet', 'y', 'yes', '1'] else "0" # Rx Only
                row[6] = "3" # Squelch
                row[9] = "4" # TOT [s]
                row[11] = "2" # Power (2 represents High usually)
                row[25] = "1" # Leader/MS
                row[27] = "1" # Contact Name
                row[28] = "1" # Group List
                row[29] = "1" # Color Code
                row[34] = "0" # GPS System
                
                row[35] = ctcss_dec # CTCSS/DCS Dec
                row[36] = ctcss_enc # CTCSS/DCS Enc
                
                row[40] = "2" # Non-QT/DQT
                row[41] = "1" # Display PTT
                row[42] = "1" # Reverse Burst

                writer.writerow(row)
                
            # PMR Kanalları Ekleme
            if include_pmr in ['e', 'evet', 'y', 'yes', '1']:
                print("PMR Kanalları (Analog & Dijital) listeye ekleniyor...")
                pmr_frequencies = [
                    ("446.00625", "PMR 1"), ("446.01875", "PMR 2"), ("446.03125", "PMR 3"), ("446.04375", "PMR 4"),
                    ("446.05625", "PMR 5"), ("446.06875", "PMR 6"), ("446.08125", "PMR 7"), ("446.09375", "PMR 8"),
                    ("446.10625", "PMR 9"), ("446.11875", "PMR 10"), ("446.13125", "PMR 11"), ("446.14375", "PMR 12"),
                    ("446.15625", "PMR 13"), ("446.16875", "PMR 14"), ("446.18125", "PMR 15"), ("446.19375", "PMR 16")
                ]
                
                dpmr_frequencies = [
                    ("446.103125", "dPMR 1"), ("446.109375", "dPMR 2"), ("446.115625", "dPMR 3"), ("446.121875", "dPMR 4"),
                    ("446.128125", "dPMR 5"), ("446.134375", "dPMR 6"), ("446.140625", "dPMR 7"), ("446.146875", "dPMR 8"),
                    ("446.153125", "dPMR 9"), ("446.159375", "dPMR 10"), ("446.165625", "dPMR 11"), ("446.171875", "dPMR 12"),
                    ("446.178125", "dPMR 13"), ("446.184375", "dPMR 14"), ("446.190625", "dPMR 15"), ("446.196875", "dPMR 16")
                ]

                # Analog PMR
                for freq, name in pmr_frequencies:
                    row = ["0"] * len(csv_headers)
                    row[0] = "1" # Analog Mode
                    row[1] = name
                    row[2] = freq
                    row[3] = freq
                    row[4] = "0"
                    row[6] = "3"
                    row[9] = "4"
                    row[11] = "2"
                    row[25] = "1"
                    row[27] = "1"
                    row[28] = "1"
                    row[29] = "1"
                    row[35] = "None"
                    row[36] = "None"
                    row[40] = "2"
                    row[41] = "1"
                    row[42] = "1"
                    writer.writerow(row)
                    
                # Digital PMR
                for freq, name in dpmr_frequencies:
                    row = ["0"] * len(csv_headers)
                    row[0] = "2" # Digital Mode
                    row[1] = name
                    row[2] = freq
                    row[3] = freq
                    row[4] = "0"
                    row[6] = "1"
                    row[9] = "4"
                    row[11] = "2"
                    row[25] = "1"
                    row[35] = "None"
                    row[36] = "None"
                    row[40] = "2"
                    row[41] = "1"
                    row[42] = "1"
                    writer.writerow(row)

        print(f"İşlem tamamlandı! Veriler '{csv_filename}' dosyasına başarıyla kaydedildi.")

    except requests.exceptions.RequestException as e:
        print(f"Hata oluştu: Veri çekilemedi. Detay: {e}")
    except json.JSONDecodeError:
        print("Hata: Gelen veri geçerli bir JSON formatında değil.")
    except Exception as e:
        print(f"Beklenmeyen bir hata oluştu: {e}")

if __name__ == "__main__":
    fetch_and_parse_roles()
