
<!doctype html>
<html lang="en">

<head>

<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

<meta name="description" content="Silicon Pay API documentation">
<meta name="keywords" content="silicon pay, payment gateway, online payments, digital payments, recieve payments, api documentation">
<meta name="author" content="Silicon Savannah">
<meta property="og:title" content="Silicon Pay Developer Documentation" />
<meta property="og:description" content="Silicon Pay Developer Documentation" />
<meta property="og:image" content="https://silicon-pay.com/assets/default/assets/logo/silicon_pay.png" /> 
<meta property="og:url" content="http://developer.silicon-pay.com/">


<meta name="twitter:title" content="Payment Solution For The Internet, Developer documentation.">
<meta name="twitter:description" content="Silicon Pay Developer Documentation">
<meta name="twitter:image" content="https://silicon-pay.com/">

<link href="/assets/css/bootstrap.min.css" rel="stylesheet">
<link href="/assets/css/pace.min.css" rel="stylesheet">
<link href="/assets/fontawesome/css/all.css" rel="stylesheet">
<link href="/assets/themify-icons/themify-icons.min.css" rel="stylesheet">
<link href="/assets/css/metisMenu.min.css" rel="stylesheet">
<link href="/assets/css/github.min.css" rel="stylesheet">
<link href="/assets/css/magnific-popup.min.css" rel="stylesheet">
<link href="/assets/OwlCarousel2/owl.carousel.min.css" rel="stylesheet">
<link href="/assets/OwlCarousel2/owl.theme.default.min.css" rel="stylesheet">
<link href="assets/css/style.css" rel="stylesheet">
<title>SILICON PAY DEVELOPER GUIDE</title>

<link rel="icon" type="image/png" href="https://silicon-pay.com/assets/default/assets/logo/silicon_pay.png" />
<script async src='cdn-cgi/bm/cv/669835187/api.js'></script></head>
<body>
<div class="loader">
<div class="top-search">
<div class="input-group">
<span class="input-group-addon"><i class="ti-search"></i></span>
<input type="text" class="form-control" placeholder="Search for snippets ......">
<span class="input-group-addon close-search"><i class="ti-close"></i></span>
</div>
</div>

<nav class="navbar navbar-expand-lg navbar-light fixed-top">
<a class="navbar-brand" href="index.html">
<img src="https://silicon-pay.com/assets/default/assets/logo/silicon_pay.png" alt="">
</a>
<button class="navbar-toggler" type="button" data-toggle="collapse" id="sidebarCollapse" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
<span class="navbar-toggler-icon"></span>
</button>
<div class="collapse navbar-collapse" id="navbarSupportedContent">
<ul class="navbar-nav mr-auto">

<li class="nav-item">
<a class="nav-link" href="/index.php">Home</a>
</li>
<li class="nav-item">
<a class="nav-link" href="#">Contact Us</a>
</li>

</ul>

</div>
</nav>

<nav id="sidebar">
<div class="sidebar-header">
<br><hr>
<h3><span>API </span>Documentation</h3>

</div>
<ul class="metismenu sidebarMenu list-unstyled">

<li class="active">
<a class="has-arrow" href="/collections.php" aria-expanded="true">Mobile Money Collections</a>

<ul aria-expanded="true">
<li><a href="collections.php#ugx">UGX Collection</a></li>
<li><a href="/tron">USDT Collections</a></li>
<li><a href="tron">TRX Collections</a></li>

<li class="active">
<a class="has-arrow" href="#" aria-expanded="true">Credit Card</a>
<li><a href="/credit-card.php">USD Collection</a></li>
</li>

<li class="active">
<a class="has-arrow" href="#" aria-expanded="true">TRANSFERS</a>
<ul aria-expanded="true">
<li><a href="/transfers.php">MOBILE MONEY</a></li>
<li><a href="/tron">CRYPTO CURRENCE</a></li>
<li><a href="">BANK ACCOUNTS</a></li>

</ul>
</li>
</ul>
</nav>

<div class="page-content">
<div class="content-wrapper">
<div class="row">
 <div class="col-md-9 content">


<div class="doc-content">
<h1>Transfers and Payouts to Mobile Money Wallets</h1>
<p>You can withdraw your earning via or our dashboard or using our withdraw API.</p>
<h4> 
Dashboard withdraws
</h4>
<p>
To transfer  from the dashboard, Click on Finance->Make a Transfer. Enter the details required;
Enter the details and complete you transfer.

</p>
<h4> Withdraw API</h4>
<p>
Alternatively, u can make payouts using our Withdraw API.

Send the Withdraw load to https://silicon-pay.com/api_withdraw

Request ($req). To withdraw money to a user mobile money number, pass this as 'mm' req"=>"mm"
</p>

<h4>Generate an Authorization Token.</h4>
<pre class="snippet"><code class="html">

$encryption_key = "Your account Encryption Key";
$secrete_key = "Your Account Secrete key";

$secrete_hash = hash('sha512',$secrete_key);

$headers  = [
  'encryption_key: '.$encryption_key,
  'secrete_hash: '.$secrete_hash,
  'Content-Type: application/json'
];


$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://silicon-pay.com/generate_token',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'GET',
  CURLOPT_HTTPHEADER => .$headers,
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;

</code></pre>
<h4>
<h4>Sample "getToken" response</h4>
<p> When all the  parameters are correct, You shall get a JSON  response with a token code. Use thhis token to authenticate your payload when completing a transfer, </p> 
<pre class="snippet"><code class="html">
  
{
  "code":200,
  "status":"successful",
  "token":"6dbab67ce7a2a56ad45dff74262aee89f3b17c7f"
}

</code></pre>

<h4> Make Transfer/ Withdraw to mobile money</h4>
<p> This end point is used to send transfer money from your silicon pay wallet to a mobile money account number </p> 
<pre class="snippet"><code class="html">
  // Sample PHP pay Load

$data_req = [
"req"=>"mm",
"currency"=>"transfer-currency",
"txRef"=>"unique tx_ref",
"encryption_key"=>" Your Account Encryption Key",
"amount"=>"transfer Amount",
"emailAddress"=>"user-email-address",
"call_back"=>"your-call-back-url",
"phone"=>"recipient MSISDN number",
"reason"=>"reason for transfer","
debit_wallet"=>"Wallet to debit from"
];

$token = 'Enter token generated from "https://silicon-pay.com/generate_token" end point';

// Now Create a Signature that you shall pass in the header of your request.
$secrete_key ="XXXX";
$encryption_key = "XXXXX";
$phone_number = "XXXX";

$msg	=	hash('sha256',$encryption_key).$phone_number;

$signature	= hash_hmac('sha256',$msg, $secrete_key);
  
$headers  = [
  'Authorization: Bearer '.$token,
  "signature:". $signature,
  'Content-Type: application/json'
];

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://silicon-pay.com/api_withdraw',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>json_encode($data_req),
  CURLOPT_HTTPHEADER => $headers,
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;

</code></pre>
<h4>

<h2 id="table-head-options"><span>Parameter Description<a class="header-link" href="#"><i class="ti-link"></i></a></span></h2>
<table class="table">
<thead class="thead-shades">
<tr>
<th scope="col">#</th>
<th scope="col">Parameter</th>
<th scope="col">Description</th>
</tr>
</thead>
<tbody>
<tr>
<th scope="row">1</th>
<td>encryption_key</td>
<td>Your-Account-Encryption-key". Found on top of your dashboard</td>

</tr>
<tr>
<th scope="row">2</th>
<td>Amount</td>
<td> Amount that you are transfering</td>

</tr>

<tr>
<th scope="row">3</th>
<td>emailAddress</td>
<td>Email Address of the recipient</td>

</tr>

<tr>
<th scope="row">4</th>
<td>phone</td>
<td>MSISDN Phone number of the recipient</td>

</tr>

<tr>
<th scope="row">5</th>
<td>txRef</td>
<td>Unique Transaction Reference</td>
</tr>
<th scope="row">6</th>
<td>call_back</td>
<td>Call Back url where we shall push a success notification</td>
</tr>
<tr>
<th scope="row">7</th>
<td>currency</td>
<td>This is the currency in which you are transacting in</td>
</tr>
<tr>
<th scope="row">8</th>
<td>debit_wallet</td>
<td>The wallet that you are debiting this transfer from</td>

</tr>
<tr>
<th scope="row">9</th>
<td>secrete_key</td>
<td>This is the secrete key that you recieved when you had created the account. Keep it safe</td>

</tr>
</tbody>
</table>
<h4>Response</h4>
<p> When all the payload parameters are correct, Send back a json response and process your transfer.</p> 
<pre class="snippet"><code class="html">
{
"status":"successful",
"amount":10000,
"currency":"UGX",
"txRef":"XSD90",
"message":"Transfer accepted",
"account_number":"256704526090",

};

</code></pre>

<h4>Success Call Back Notification.</h4>
<p> Sample response that shall be triggered and sent to the call back url when the transfer  is successful</p>
<pre class="snippet"><code class="html">
{
"status":"successful",
"amount":"XXXXX",
"currency":"XXXX",
"txRef":"XXXXX",
"message":"Transfer recieved",
"account_number":"XXXXX",
"charge":"XXXX",
"secure_hash":"XXXXX"
};

</code></pre>

<h4>Failure Call Back Notification.</h4>
<p> Sample response that shall be triggered and sent to the call back url when the transfer  is has failed</p>
<pre class="snippet"><code class="html">
{
"status":"failed",
"amount":"XXXXX",
"currency":"XXXX",
'reason','reason for failure',
"txRef":"XXXXX",
"message":"Transfer failed",
"account_number":"XXXXX",
"secure_hash":"XXXXX"
};

</code></pre>
<h4>Process IPN/Call Back</h4>
<p>A secure hash is sent with the call back data. This is to help you confirm that the call back came from us. </p> 
<pre class="snippet"><code class="html">
// Recieve IPN. 

$body = file_get_contents("php://input");
$dataObject = json_decode($body);

$reference = $dataObject->txRef;
$secure_hash = $dataObject->secure_hash;
$secrete_key ="Enter your account Secrete key";

// Generate a secure hash on your end.
  $cipher = 'aes-256-ecb';
	$generated_hash = openssl_encrypt($reference, $cipher, $secrete_key);
  
  if($generated_hash == $secure_hash){
    // The call back came from us. 
    // Give value to your customers.
  }

</code></pre>

<h4>Check Transfer Status.</h4>
<p>It is good practice to check the tranfer status on our end before giving value to your cuatomers.</p>
<pre class="snippet"><code class="html">
// Sample Pay Load
$payload = ["encryption_key"=>"XXXXX"];

//parameters
$transaction_reference =  "XXXXX";

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://silicon-pay.com/tranfer_status/'.$transaction_reference,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>json_encode($payload),
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;

</code></pre>
<h4>Sample Check Transfer status Response</h4>
<p> Sample response for a successful check transfer status</p>
<pre class="snippet"><code class="html">

{"code":200,"status":"SUCCESSFUL","amount":"270800","currency":"UGX"}

</code></pre>



</div>

</div>
</div>

<footer class="site-footer">
<div class="row align-items-center ">
<div class="col-md-7 order-md-first order-last">
<div class="Copyright-text">
<p class="m-0">Copyright © 2018-2026 <a href="#" target="_blank">Silicon Pay </a>. All rights reserved. </p>
</div>
</div>

</div>
</footer>
</div>
<div class="overlay"></div>
</div>

<script data-cfasync="false" src="cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script><script src="assets/js/jquery-3.3.1.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/popper.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/bootstrap.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/pace.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/jquery.easing.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/jquery.dd.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/metisMenu.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/ResizeSensor.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/theia-sticky-sidebar.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/highlight.pack.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="assets/js/clipboard.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/jquery.magnific-popup.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/OwlCarousel2/owl.carousel.min.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="/assets/js/script.js" type="a3f8f4d78f48d3a58348146b-text/javascript"></script>
<script src="cdn-cgi/scripts/7d0fa10a/cloudflare-static/rocket-loader.min.js" data-cf-settings="a3f8f4d78f48d3a58348146b-|49" defer=""></script><script type="text/javascript">(function(){window['__CF$cv$params']={r:'6908cee54b184f75',m:'QAldheB_ApVGmniVDxnzViUEvykakk2exyZ33vXsrgQ-1631949589-0-AU6VaBlYLHtfHe1PVs7u+ZMSMvOdotHoDrhqy8/XjaKCGqEIrB+JoS7uy7ph2qqIPtA9ald2EWgP746iMmBrVflDlUbcvO82gJfcmohue1SoQyl7cfVqZzmRl9/P0I5LCA==',s:[0x55a5ba7df9,0x9708aeea82],}})();</script><script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"rayId":"6908cee54b184f75","token":"4e0c83f93d3046d09e1031a529120ea1","version":"2021.8.1","si":10}'></script>
</body>

</html>
