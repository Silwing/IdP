var http = require("http"),
	url = require("url"),
	qs = require("querystring"),
	nock = require("nock"), // TODO: remove in final version
	authzServer = { hostname: "localhost", 
	                port: 8889,
	                paths: {
	                	redirect: "/login",
	                	access: "/access"
	                }},
	resServer = { hostname: "localhost",
	              port: 8890,
	              paths: {
	              	info: "/info"
	              }},
	selfServer = { hostname: "localhost", 
	               port: 8888,
	               paths: {
	               	authorize: "/authorize"
	             }},
	clientID = "",
	responseType = "code",
	accessToken = undefined, tokenType = undefined;

/*nock("http://" + resServer.hostname + ":" + resServer.port)
.filteringPath(function(path) {
	return "/info";
})
.get("/info")
.reply(200, {name: "Testnavn"});*/

(function start() {

	function sendHeader(response) {
		response.writeHead(200, {"Content-Type": "text/html"});
		response.write("<!DOCTYPE html>");
		response.write("<html>");
		response.write("<head>");
		response.write("<title>Most Fantastic OAuth App</title>");
		response.write("</head>");
		response.write("<body>");
	}

	function sendFooter(response) {
		response.write("</body>");
		response.write("</html>");
		response.end();
	}

	function getServerString(serverObj) {
		return "http://" + serverObj.hostname + ":" + serverObj.port;
	}

	function getRequest(options, callback) {
		return http.get(options, callback);
	}

	function mainPage(request, response, urlObj) {
		sendHeader(response);
		response.write("<h1>Welcome</h1>");
		response.write("<p>To start using this wonderful application click on the login button below.</p>");
		response.write("<div class='login-wrapper'><a href='/init'>Login</a>");
		sendFooter(response);
	}

	function init(request, response, urlObj) {
	    response.writeHead(303, {"Location": 
	    	                           getServerString(authzServer) + authzServer.paths.redirect + "?" + 
	    	                           qs.stringify({
	    	                           	clientId: clientID, 
	    	                           	responseType: responseType,
	    	                           	returnUrl: getServerString(selfServer) + selfServer.paths.authorize
	    	                           })});
	    response.end();		
	}

	function authorize(request, response, urlObj) {
		var authzCode = urlObj.query.authzCode,
		    authOptions = { hostname: authzServer.hostname,
		    	            port: authzServer.port,
		    	            path: authzServer.paths.access + "?" + qs.stringify({authzCode: authzCode, clientId: clientID})
        	        };

        if(!authzCode) {
        	response.writeHead(400, {"Content-Type": "text/plain"});
        	response.write("Your request was invalid. Please use only valid requests.");
        	response.end();
        	return;
        }

        var authReq = getRequest(authOptions, function(authResp) {
        	if(authResp.statusCode == 200) {
        		authResp.setEncoding("utf8");
        		var jsonData = "";
        		authResp.on("data", function(chunk) {
        			jsonData += chunk;
        		})
        		.on("end", function() {
        			var dataObj = JSON.parse(jsonData);
        			accessToken = dataObj.accessToken;
        			tokenType = dataObj.tokenType;
        		})
        		.on("end", function() {
        			var resOptions = { hostname: resServer.hostname,
        				               port: resServer.port,
        				               path: resServer.paths.info + "?" + qs.stringify({accessToken: accessToken, tokenType: tokenType})
        			},
        			    resReq = getRequest(resOptions, function(resResp) {
        			    	if(resResp.statusCode == 200) {
        			    		var resData = "";
        			    		resResp.on("data", function(chunk) {
        			    			resData += chunk;
        			    		})
        			    		.on("end", function() {
        			    			var resObj = JSON.parse(resData);
        			    			sendHeader(response);
        			    			response.write("<p>Hej " + resObj.name + "</p>");
        			    			response.write("<p>Tillykke! Du er nu logget ind.</p>");
        			    			sendFooter(response);
        			    		});
        			    	}
        			    	else if(resResp.statusCode == 400) {
        			    		var resData = "";
        			    		resResp.on("data", function(chunk) {
        			    			resData += chunk;
        			    		})
        			    		.on("end", function() {
        			    			var resObj = JSON.parse(resData);
        			    			sendHeader(response);
        			    			response.write("<p>"+resObj.error+"</p>");
        			    			sendFooter(response);
        			    		});
        			    	}
        			    }).on("error", function(err) { console.log("Error:");console.log(err); });
        		});
        	} else if(authResp.statusCode == 400) {
        		authResp.setEncoding("utf8");
        		var jsonData = "";
        		authResp.on("data", function(chunk) {
        			jsonData += chunk;
        		})
        		.on("end", function() {
        			var dataObj = JSON.parse(jsonData);
        			sendHeader(response);
        			response.write("<p>Vi kunne desværre ikke logge dig ind :(</p>");
        			sendFooter(response);
        		})
        	}
        });
	}

	function onRequest(request, response) {
		var urlObj = url.parse(request.url, true);

		switch(urlObj.pathname) {

			case "/":
			    mainPage(request, response, urlObj);
			break;

			case "/init":
			    init(request, response, urlObj);
			break;

			case "/authorize":
			    authorize(request, response, urlObj);
			break;

			default:
			    response.writeHead(404, {"Content-Type": "text/plain"});
			    response.write("We could not find anything matching your request... :'(");
				response.end();
			break;
		}
	}

	if(process.argv.length < 3) {
		console.log("Usage: node client.js clientID [port] [hostname]");
		return;
	}
	if(process.argv.size > 3)
		selfServer.port = process.argv[3];
	if(process.argv.size > 4)
		selfServer.hostname = process.argv[4];

	clientID = process.argv[2];
	http.createServer(onRequest).listen(selfServer.port);

})();