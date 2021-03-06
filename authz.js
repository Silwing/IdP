var http = require("http"),
	url = require("url"),
	qs = require("querystring"),
	users = [{uid: 1, username: "user1",password: "1234"},{uid: 2, username: "user2", password: "4321"}],
	clients = [{cid: "cid123456", name: "Awesome App 1"}, {cid: "cid123457", name: "Awesome App 2"}],
	accessArray = [],
	acCounter = 0,
	atCounter = 0;


(function start() {

	
	function onRequest(request, response) {
		var urlObj = url.parse(request.url, true);
		
		switch (urlObj.pathname) {
			case "/login":
				login(request,response,urlObj);
				break;
			case "/authenticate":
				authenticate(request,response,urlObj);			
				break;
			case "/access":
				access(request,response,urlObj);			
				break;
			case "/verify":
				verify(request,response,urlObj);				
				break;
			default:
				console.log(request.url);
				error(response,"We could not find anything matching your request... :'(");
		}
	}
	
	/*
	*	Handle login request (3/4)
	*	Get login request from client through the browser and send request to user/browser
	*/
	function login(request,response,urlObj) {
		var clientid = urlObj.query.clientId;
		var responsetype = urlObj.query.responseType;
		//var returnurl = urlObj.query.returnUrl;
			
		if(responsetype != "code"){
			error(response,"The response type must be 'code'");
		}
			
		if(!checkClientId(response, clientid)) {
			return;
		}
			
		//todo: returner login side til browser
		userLogin(request,response,urlObj);
	}

	function findClientFromId(clientId) {
		for(var j = 0; j < clients.length; j++){
			if(clientId == clients[j].cid){
				return clients[j];
			}
		}
		return undefined;
	}
	
	function userLogin(request,response,urlObj){
		var client = findClientFromId(urlObj.query.clientId);
		if(!client) {
			error(response, "Authorization request from invalid client");
			return;
		}
		response.writeHead(200, {"Content-Type": "text/html"});
		response.write("<!DOCTYPE html>");
		response.write("<html>");
		response.write("<head>");
		response.write("<title>Login</title>");
		response.write("</head>");
		response.write("<body>");
		
		response.write("<h1>Please login</h1>");
		response.write("<form action=\"authenticate\" method=\"GET\">");
		response.write("<p>Please login to authorize with the application called '" + client.name + "'</p>");
		response.write("<fieldset>");
		response.write("<legend>Login information:</legend>");
		response.write("Username:<br>");
		response.write("<input type=\"text\" name=\"username\">");
		response.write("<br>");
		response.write("Password:<br>");
		response.write("<input type=\"password\" name=\"password\">");
		response.write("<br><br>");
		response.write("<input type=\"hidden\" name=\"clientId\" value=\""+client.cid+"\">");
		response.write("<input type=\"hidden\" name=\"returnUrl\" value=\""+urlObj.query.returnUrl+"\">");
		response.write("<input type=\"submit\" value=\"login\"></fieldset>");
		response.write("</form>");

		response.write("</body>");
		response.write("</html>");
		response.end();
	}
	
	/*
	*	Handle authentication of user (7/9)
	*	Get info from user and send to client through the browser
	*/
	function authenticate(request,response,urlObj) {	
		var username = urlObj.query.username;
		var password = urlObj.query.password;
		var clientid = urlObj.query.clientId;
		var returnurl = urlObj.query.returnUrl;
		
		for(var i = 0; i < users.length; i++){
			if(username == users[i].username && password == users[i].password){
				if(findClientFromId(clientid)) {
					var code = "ac" + acCounter;
					accessArray.push({cid: clientid, uid: users[i].uid, code: code, token: "at" + atCounter, isAuthorized: false});
					acCounter++;
					atCounter++;
					response.writeHead(303, {"Location": qs.unescape(returnurl) + "?" + qs.stringify({authzCode: code})});
					response.end();
					return;
				}
				error(response, "Invalid client ID");
				return;
			}
		}
		
		error(response,"Wrong username or password");			
		
	}
	
	/*
	*	Handle access request from client (10/12)
	*	Communicate directly with client
	*/
	function access(request,response,urlObj) {
		var clientid = urlObj.query.clientId;
		var acode = urlObj.query.authzCode;
		
		for(i = 0; i < accessArray.length; i++){
			if(clientid == accessArray[i].cid && acode == accessArray[i].code){
				if(accessArray[i].isAuthorized) {
					response.writeHead(400, {"Content-Type": "application/json"});
					response.write(JSON.stringify({error: "Invalid authorization code"}));
					response.end();
				} else {
					accessArray[i].isAuthorized = true;
					response.writeHead(200, {"Content-Type": "application/json"});
					response.write(JSON.stringify({accessToken: accessArray[i].token, tokenType: "bearer"}));
					response.end();
				}
				return;
			}
		}
		
		error(response,JSON.stringify({error: "ClientId or authorization code not valid"}));		
	}
	
	/*
	*	Handle verification of access (17) 
	* 	Communicate with the resource server
	*/
	function verify(request,response,urlObj) {
		var token = urlObj.query.accessToken;
		var i;

		for(i = 0; i < accessArray.length; i++){
			if(token == accessArray[i].token){
				response.writeHead(200, {"Content-Type": "application/json"});
				response.write(JSON.stringify({uid: accessArray[i].uid}));
				response.end();
				break;
			}
		}
		
		if(i == accessArray.length){
			response.writeHead(400, {"Content-Type": "application/json"});
			response.write(JSON.stringify({error: "Not a valid access token"}));
			response.end();
		}
		else{
			accessArray.splice(i,1);
		}	
	}
	
	
	function checkClientId(response, clientid) {
		for(var i = 0; i < clients.length; i++) {
			if(clients[i].cid == clientid)
				return true;
		}
		error(response, "Client with id " + clientid + " is not a registered client");
		return false;
	}
	
	function error(response, msg) {
		response.writeHead(400, {"Content-Type": "text/plain"});
		response.write(msg);
		response.end();
		return;
	}
	
	http.createServer(onRequest).listen(8080);

})();