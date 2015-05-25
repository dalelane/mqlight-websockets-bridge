# mqlight-websockets-bridge

## Overview
A simplified example of how to build a proxy to allow web apps to subscribe to mqlight topics and get the message via WebSockets.

![arch diagram](http://dalelane.co.uk/blog/post-images/150519-mqlight-with-websockets.jpg)

## Usage (client)
### Snippet to include in HTML
```
<!-- taken from the depends folder -->
<script src="primus.js"></script>

<script>
    var wsproxy = 'http://yourappname.mybluemix.net/';

    // using wildcards is fine, but you should URL-encode it first
    var topic = 'yourtopicname';

    var primus = new Primus(wsproxy + '?topic=' + topic);
    primus.on('data', function onmsg(data) {
        // this is your callback - when a message is published to mqlight
        //  your web app will get it here
    });
</script>
```

## Usage (server)
### Running locally
(Needs mqlight to be running locally)
```
npm install
npm start
```

### Running in BlueMix
If you include this in an app deployed to Bluemix, it will connect to an MQ Light service bound to your app. 
