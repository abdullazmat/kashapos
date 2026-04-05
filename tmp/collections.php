
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
<h1>Collections</h1>

<h2 id="examples"><span> Mobile Money collections <a class="header-link" href="#"><i class="ti-link"></i></a></span></h2>
<p>This section demostrates how you can use Silicon Pay  to collect funds in different currencies to different wallets from your clients. You can either use the API or  the silicon pay Modal</p>

<h4>Using the Silicon Pay API</h4>
<p>
Collect payment using the silicon pay API
</p>

<h4>General Payload</h4>
<pre class="snippet"><code class="html">
  // Sample PHP pay Load
  $data_req = [
    "req"=>"mobile_money",
    "currency"=>"XXXXXX",
    "phone"=>"MSISDN",
    "encryption_key"=>"XXXXXX",
    "amount"=>"XXXX",
    "emailAddress"=>"test@gmail.com",
    'call_back'=>"your-call-back-url",
    "txRef"=> "XXXXXX"
];
$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://silicon-pay.com/process_payments',
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>json_encode($data_req),
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json',
  ),
));

$response = curl_exec($curl);

curl_close($curl);
echo $response;  
</code></pre>

<h4>Using the Silicon Pay Modal</h4>
<p>
You can  use the silicon pay modal to integrate payments into your application with limited coding. 

</p>
<p>
In your silicon Pay dashboard, click on collect payments  then payment links.  
Copy the generate payment link  and use this link to collect payments. 

</p>
<p>
Incase you are interested in getting IPN call backs when using the pay modal, You need to pass additional parameters to your payment link. 
</p>

<pre class="snippet"><code class="html">
$txRef = "Unique transaction reference";
$redirect_url = "Your Successfull payment redirect URL";
$call_back_url = "IPN/webhook notification URL";
$amount = "Amount to pay";

$paymentModalUrl = 'payment url generated from your dashboard';

// Appends these parameter as GET parameters in your payment Link URL. 
// Sample payload. 
$parameters = 'amount='.$amount.'& currency='.$currency.'&txRef='.$txRef.'&call_back_url='.$call_back_url.'&redirect_url='.$redirect_url;
 
// Payment Modal URL. 
//Append the parameters as "Get" parameters on the payment modal URL. 
// Load the url in the browser to make the payment. 

$FinalLink = $paymentModalUrl?.$parameters

// You are required to load the final link in the browser to complete the payment. 


</code></pre>
<hr>
<h4  id="ugx">
UGX Collection
</h4>
<p>For UGX collections, Pass currency as UGX</p>
<pre class="snippet"><code class="html">
  "currency"=>"UGX"
</code></pre>

<h4  id="tzs">
TZS Collection
</h4>
<p>For TZS collections, Pass currency as TZS</p>
<pre class="snippet"><code class="html">
  "currency"=>"TZS"
</code></pre>

<h4  id="kes">
KES Collection
</h4>
<p>For KES collections, Pass currency as KES</p>
<pre class="snippet"><code class="html">
  "currency"=>"KES"
</code></pre>

<h4  id="zmw">
ZMW Collection
</h4>
<p>For ZMW collections, Pass currency as ZMW</p>
<pre class="snippet"><code class="html">
  "currency"=>"ZMW"
</code></pre>

<h4  id="rwf">
RWF Collection
</h4>
<p>For RWF collections, Pass currency as RWF</p>
<pre class="snippet"><code class="html">
  "currency"=>"RWF"
</code></pre>

<h4  id="ngn">
NGN Collection
</h4>
<p>For NGNcollections, Pass currency as NGN</p>
<pre class="snippet"><code class="html">
  "currency"=>"NGN"
</code></pre>

<h4  id="xof">
XOF Collection
</h4>
<p>For XOF collections, Pass currency as XOF</p>
<pre class="snippet"><code class="html">
  "currency"=>"XOF"
</code></pre>

<h4  id="xaf">
XAF Collection
</h4>
<p>For XAF collections, Pass currency as XAF</p>
<pre class="snippet"><code class="html">
  "currency"=>"XAF"
</code></pre>


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
<td> Amount you are charging the user</td>

</tr>

<tr>
<th scope="row">3</th>
<td>emailAddress</td>
<td>Email Address of the person paying</td>

</tr>

<tr>
<th scope="row">4</th>
<td>phone</td>
<td>MSISDN Phone number of the paying customer.</td>

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
<td>This is the currency in which you are charging the customer</td>
</tr>
</tbody>
</table>
<h4>Response</h4>
<p> When all the payload parameters are correct, We shall a push notification to the MSIDN number provided. Below is the sample response code</p> 
<pre class="snippet"><code class="html">
{
  "status":"Successful",
  "message":"A push Notification has been sent to the Customer",
  "txRef":1234589
}
</code></pre>

<h4>Success Call Back Notification.</h4>
<p> Sample response that shall be triggered and sent to the call back url when the trasanction is  successful</p>
<pre class="snippet"><code class="html">

{
  "status":"successful",
  "amount":"xxxxx",
  "txRef":"XXXX",
  "nework_ref":"XXXXX",
  "msisdn":"XXXXX",
  "secure_hash":"XXXXX"
}
</code></pre>

<h4>Failure Call Back Notification.</h4>
<p> Sample response that shall be triggered and sent to the call back url when the trasanction  has  Failed</p>
<pre class="snippet"><code class="html">

{
  "status":"failed",
  "amount":"xxxxx",
  'reason': "reason for failure",
  "txRef":"XXXX",
  "nework_ref":"XXXXX",
  "msisdn":"XXXXX",
  "secure_hash":"XXXXX"
}
</code></pre>


<h4>Process IPN/Call Back</h4>
<p>A secure hash is sent with the call back data. This is to help you confirm that the call back came from us. </p> 
<pre class="snippet"><code class="html">
// Recieve IPN. 

$body = file_get_contents("php://input");
$dataObject = json_decode($body);

$reference = $dataObject->txRef;
$secure_hash = $dataObject->secure_hash;
$secrete_key ="Enter your account Secrete key"

// Generate a secure hash on your end.
  $cipher = 'aes-256-ecb';
	$generated_hash = openssl_encrypt($reference, $cipher, $secrete_key);
  
  if($generated_hash == $secure_hash){
    // The call back came from us. 
    // Give value to your customers.
  }

</code></pre>


<h4>Check Transaction Status.</h4>
<p>It is good practice to check the transaction status on our end before giving value to your cuatomers.</p>
<pre class="snippet"><code class="html">
// Sample Pay Load
$payload = ["encryption_key"=>"XXXXX"];

//parameters
$transaction_reference =  "XXXXX";


$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => 'https://silicon-pay.com/transaction_status/'.$transaction_reference,
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
<h4>Sample Check Transaction status Response</h4>
<p> Sample response for a successful check transaction status</p>
<pre class="snippet"><code class="html">

{"code":200,"status":"SUCCESSFUL","amount":"5000","currency":"UGX"}

</code></pre>

<h4>Plugins and SDK</h4>
<a href = 'https://github.com/AfricanSiliconValley/wp-plugin'>
<p> Wordpress Plugin </p></a>
<pre class="snippet"><code class="html">

<a href = 'https://github.com/AfricanSiliconValley/woo-commerce/'>
<p> Woo-commerce  Plugin </p></a>
<pre class="snippet"><code class="html">



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
