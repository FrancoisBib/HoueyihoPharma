# Documentation API DIRECT SYCAPAY

## II. Objet du présent document

Ce document décrit la procédure à utiliser par un partenaire / client pour l'interconnexion avec la plateforme SYCA PAY en vue de mettre à la disposition des clients, un moyen de paiement en ligne simple, fiable et sécurisé.

## III. Méthodologie d'implémentation

L'appel du système s'effectue via l'envoi des données en POST et en JSON.

La méthodologie d'implémentation de SYCA PAY API DIRECT est de type REST et les données sont postées en JSON.

L'exécution de la phase d'authentification en cas de succès se soldé par la génération et le retour d'un token valable juste **40 secondes**.

Les paramètres requis pour effectuer le paiement seront postés en JSON.

La vérification du statut de la transaction se fera par le POST de la référence de paiement.

## IV. Paiements

Les BaseUrls d'authentification et de paiement sont définis comme suit :

| Environnement | URL |
|--------------|-----|
| **TEST** | `https://dev.sycapay.net/api/` |
| **PRODUCTION** | `https://dev.sycapay.com/` |

---

### 1. Phase d'authentification

L'URL d'appel pour la phase d'authentification se définit comme suit :

```
{baseUrl}/login.php
```

#### Paramètres à envoyer

##### Header

| Paramètre | Description | Type |
|-----------|-------------|------|
| `X-SYCA-MERCHANDID` | (Obligatoire) Identification du marchand fourni par Sycapay | String |
| `X-SYCA-APIKEY` | (Obligatoire) API KEY du marchand fourni par Sycapay | String |
| `X-SYCA-REQUEST-DATA-FORMAT` | (Obligatoire) Type d'envoi des données (JSON ou KVP) | String |
| `X-SYCA-RESPONSE-DATA-FORMAT` | (Obligatoire) Type de réception des données (JSON ou KVP) | String |

##### Body

| Paramètre | Description | Type |
|-----------|-------------|------|
| `montant` | (Obligatoire) Le montant de la transaction | String/Number |
| `currency` | (Obligatoire) La devise du montant | String |

#### Paramètres retournés en cas de SUCCESS

| Paramètre | Description |
|-----------|-------------|
| `code` | Code retourné |
| `token` | Token utilisé pour l'identification du marchand et favorable à l'accès à la plateforme SYCAPAY valable 40 secondes |
| `desc` | Description du code retourné |
| `amount` | Le montant de la transaction |

> **NB** : Pour des raisons de sécurité, les paramètres d'authentification sont déclarés dans l'entête de la requête.

#### Exemple d'utilisation API REST

**Requête :**

```json
{
  "montant": "100",
  "currency": "XOF"
}
```

**Réponse :**

```json
{
  "code": 0,
  "token": "8e9bbf417cfb004c06734a471183c98f0yurytu78789c9458ae694d",
  "desc": "SUCCESS",
  "amount": "100"
}
```

#### Exemple d'appel CURL PHP pour la récupération du token

```php
$headers = array(
    'X-SYCA-MERCHANDID: XXXXXXXXX',
    'X-SYCA-APIKEY: XXXXXXXXXXX',
    'X-SYCA-REQUEST-DATA-FORMAT: JSON',
    'X-SYCA-RESPONSE-DATA-FORMAT: JSON'
);

$paramsend = array(
    "montant" => "100",
    "currency" => "XOF"
);

$url = "{baseUrl}/login.php";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_VERBOSE, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
curl_setopt($ch, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
$data_json = json_encode($paramsend);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data_json);
$response = json_decode(curl_exec($ch), TRUE);

if (empty($response)) {
    echo "Error Number:" . curl_errno($ch) . "<br>";
    echo "Error String:" . curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
}

curl_close($ch);

if ($response['code'] == 0) {
    $token = $response['token'];
} else {
    echo $response['code'];
    echo $response['desc'];
}
```

---

### 2. Phase de paiement par la méthode JSON

L'URL d'appel pour le post des paramètres en test se définit comme suit :

```
{baseUrl}/checkoutpay.php
```

#### Paramètres à envoyer

| Paramètre | Description | Type |
|-----------|-------------|------|
| `marchandid` | (Obligatoire) Identification fournie par SYCAPAY | String |
| `token` | (Obligatoire) Le token retourné lors de la phase d'authentification | String |
| `telephone` | (Obligatoire) Le numéro de téléphone du client qui effectue la transaction | String |
| `name` | (Optionnel) Le nom du client | String |
| `pname` | (Optionnel) Le prénom du client | String |
| `urlnotif` | (Optionnel) L'url de notification | String |
| `montant` | (Obligatoire) Le montant de la transaction | String/Number |
| `currency` | (Obligatoire) La devise du montant | String |
| `numcommande` | (Obligatoire) Le numéro de la commande (ce numéro doit être unique) | String |
| `pays` | (Obligatoire) Le pays du marchand (ex: BJ pour le Benin) | String |
| `operateurs` | (Obligatoire) L'opérateur de mobile money (ex: MtnBJ, MoovBJ, CeltisBJ) | String |

> **NB** : Le paramètre « marchandid » est disponible via votre dashboard au menu Paramètres Techniques.

#### Paramètres retournés

| Paramètre | Description |
|-----------|-------------|
| `code` | Le code retourné |
| `message` | Le message retourné de la transaction |
| `transactionId` | La référence de paiement du marchand chez Sycapay |
| `paiementId` | La référence de l'opérateur |
| `mobile` | Le numéro du payeur |
| `orderId` | Le numéro de commande |
| `amount` | Le montant de la transaction |
| `operator` | Le nom de l'opérateur |

#### Exemple d'appel CURL PHP pour le paiement

```php
$json = "{
    \"marchandid\": \"XXXXXX\",
    \"token\": \"XXXXXX\",
    \"telephone\": \"0000000000\",
    \"name\": \"XXXXXX\",
    \"pname\": \"XXXXX\",
    \"urlnotif\": \"XXXXXXX\",
    \"montant\": \"100\",
    \"currency\": \"XOF\",
    \"numcommande\": \"XXXXXX\"
}";

$url = "{baseUrl}/checkoutpay.php";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_VERBOSE, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
curl_setopt($ch, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array("Content-Type: application/json"));
curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
$response = json_decode(curl_exec($ch));
$err = curl_error($ch);
curl_close($ch);
var_dump($response);
```

#### Retour de l'API de paiement

**En cas de succès :**

```json
{
  "code": 0,
  "message": "TRANSACTION SEND",
  "transactionId": "S1510201113A172248",
  "paiementId": "XXXXXXXXXX",
  "mobile": "XXXXXXXX",
  "orderId": "bhbgfbgbf_015",
  "amount": "100",
  "operator": "MoovCI"
}
```

**En cas d'échec :**

```json
{
  "code": -5,
  "message": "Transaction echouée",
  "transactionId": "yuhV5sJAHJ3wDwG",
  "paiementId": null,
  "mobile": "XXXXXXXX",
  "orderId": "jfeerbfhbhf",
  "amount": "100",
  "operator": "MoovCI"
}
```

---

## V. Vérification du statut de la transaction

L'URL d'appel pour la vérification du statut :

```
{baseUrl}/GetStatus.php
```

#### Paramètre à envoyer

| Paramètre | Description |
|-----------|-------------|
| `ref` | (Obligatoire) La référence de paiement obtenue lors de l'appel de l'URL de paiement (transactionId) |

#### Paramètres retournés en cas de succès

| Paramètre | Description |
|-----------|-------------|
| `code` | Le code retourné de la transaction |
| `message` | Le message retourné de la transaction |
| `amount` | Le montant de la transaction |
| `orderId` | Le numéro de commande de la transaction |
| `transactionId` | La référence de paiement retourné par SycaPay |
| `paiementId` | La référence de paiement retourné par l'opérateur |
| `mobile` | Le numéro du payeur |
| `date` | La date et l'heure de la transaction |
| `operator` | Le nom de l'opérateur |

#### Exemple d'appel CURL PHP pour la vérification du statut

```php
$url = "{baseUrl}/GetStatus.php";
$paramsend = array(
    "ref" => "xxxxxxxxxxx"
);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_VERBOSE, 1);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
curl_setopt($ch, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, array("Content-Type: application/json"));
curl_setopt($ch, CURLOPT_POSTFIELDS, $paramsend);
$response = json_decode(curl_exec($ch));
$err = curl_error($ch);
curl_close($ch);
var_dump($response);
```

#### Retour de l'API GetStatus

**En cas de succès :**

```json
{
  "code": 0,
  "message": "SUCCESS PAYMENT",
  "amount": "xxxxxxxx",
  "orderId": "xxxxxx",
  "transactionID": "xxxxxxxx",
  "paiementId": "xxxxxxxxxx",
  "mobile": "xxxxxxxxxx",
  "date": "xxxxxxxxx",
  "operator": "xxxxxxxx"
}
```

**En cas de paiement en attente :**

```json
{
  "code": -200,
  "message": "PENDING STATUS",
  "montant": "xxxxxxxx",
  "amount": "xxxxxxxx",
  "orderId": "xxxxxx",
  "transactionID": "xxxxxxxx",
  "paiementId": null,
  "mobile": "xxxxxxxxxx",
  "date": "xxxxxxxxx",
  "operator": "xxxxxxxx"
}
```

---

## VI. Description des statuts de paiement

| Code | Description |
|------|-------------|
| `0` | Succès |
| `-1` | Paiement échoué |
| `-2` | Impossible de récupérer le marchand |
| `-3` | Solde du client insuffisant |
| `-4` | Service indisponible |
| `-5` | Échec code OTP |
| `-6` | Transaction terminée |
| `-7` | Paramètres incorrects (téléphone, code OTP) |
| `-8` | Timeout (durée de la session dépassée) |
| `-9` | Statut de la transaction non encore disponible |
| `-11` | Token indéfini |
| `-12` | Identifiant du Marchand indéfini |
| `-13` | Type montant incorrect |
| `-14` | Authentification error |
| `-15` | Erreur Time Out (durée de la session dépassée) |
| `-16` | INVALID MERCHAND ID |
| `-20` | Type code OTP incorrect |
| `-22` | Code OTP indéfini |
| `-100` | Paramètres d'accès incorrect |
| `-200` | Erreur HTTP / Pending status |
| `-202` | Transaction non trouvée chez l'opérateur |
| `-250` | SMS de paiement non transmise |
| `-400` | Transaction échouée |
| `-402` | Création de transaction impossible |
| `-404` | Numéro de téléphone manquant |
| `-405` | Mode d'accès invalide : risque de hacking |
| `-406` | Try exception, veuillez consulter Sycapay |
| `-500` | Erreur interne |
