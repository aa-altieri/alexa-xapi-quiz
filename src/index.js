/*  Example Alexa skill for xAPI Camp at DevLearn 2017 
**  Anthony Altieri 
**   
**  This skill will ask the user his or her name.  Then it will ask a single 
**  question about the Big Buck Bunny video to ensure the user has watched the video.  
**  It will then send the result to the LRS.
**
**  This skill will use two slots and two intents.
**
**  This skill is NOT meant for production use.  It's missing any kind of error detection
**  or fault tollerance.  The entire goal of this skills is to isolate and demonstrate one way
**  to send a useful xAPI statement from an Alexa skill.
**
**  This skill makes use of the xAPI NodeJS wrapper from Tom Creighton at ADL
**  https://github.com/adlnet-archive/xapiwrapper-node
**
**  I've added several debugging statements that are viewable on Amazon's 
**  CloudWatch console.  This is VERY handy for tracing when things are running,
**  and when things go boom.
*/

var Alexa = require('alexa-sdk');
var ADL = require('adl-xapiwrapper'); // compliments of ADL


exports.handler = function(event, context, callback) { 
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function() { //Executes when a new session is launched
        this.emit('LaunchIntent');
    },

    'LaunchIntent': function() { // Ask the user his/her name
        this.emit(':ask', "Hello!  Welcome to the DevLearn example quiz!  " +
            "This quiz will test your knowledge of the Big Buck Bunny video.  " +
            "Before we begin, may I ask your name?");
    },


    /*  The NameIntent function is run when the user says his or her name.  
        Once the user's name is saved, the quiz question will be asked.
    */
    'NameIntent': function() {
        // Print the name to the console for debugging
        console.log("NameIntent: ", this.event.request.intent.slots.FirstName.value);
        
        // Save the user name as an attribute so it persists across interactions with
        // the Alexa device.  Also, it allows easier usage later in the program
        this.attributes['FirstName'] = this.event.request.intent.slots.FirstName.value;

        // This will ask the question.  Using ":ask" tells Alexa that the Session is not ended and expects
        // the user to respond with an answer
        this.emit(':ask', "Hello, " + this.attributes['FirstName'] + "!"+
            "I will ask you a single question.  Please select the corresponding " +
            "number to the correct answer.  In the video, Big Buck Bunny, what is the " +
            "first animal you see? " +
            "1.  A flying squirrel?  " +
            "2.  A bunny?  " +
            "3.  A bird?  " +
            "4.  A Butterfly? "
        );
    },

    /*  The AnswerIntent functions when the user says a number.  This means that this intent can run BEFORE
        The NameIntent function does if the user says a number when asked for his/her name!  There is no error 
        detection here as we're isolating the xAPI functions.  I'll produce a better version of this in another
        repository
    */
    'AnswerIntent': function() {
        this.attributes['Answer'] = parseInt(this.event.request.intent.slots.Answer.value, 10);
        this.attributes['myAnswer'] = " ";
        this.attributes['message'] = " ";

        // More debug statements so we can see what information was recorded.
        console.log("answer intent");
        console.log("FirstName: ", this.attributes['FirstName']); 
        console.log("AnswerIntent: ", this.attributes['Answer']);       

        // Using a Switch to set the answer and ending message to the user.
        // First, we set the myAnswer Attribute with the animal chosen
        // Second, we set the message attribute with either congrats or condolences on your choice
        // Console logs are written for debugging if the answer chosen was correct or not
        switch (this.attributes['Answer']) {
            case 1:
                this.attributes['myAnswer'] = "Flying Squirrel";
                this.attributes['message'] = "I'm sorry, but that answer is incorrect.";
                console.log ("Wrong answser");
                break;
            
            case 2:
                this.attributes['myAnswer'] = "Bunny";
                this.attributes['message'] = "I'm sorry, but that answer is incorrect.";                
                console.log ("Wrong answser");
                break;
            
            case 3:
                this.attributes['myAnswer'] = "Bird";
                this.attributes['message'] = "Congratulation, that answer is correct.";                
                console.log ("Right answser");
                break;
            
            case 4:
                this.attributes['myAnswer'] = "Butterfly";
                this.attributes['message'] = "I'm sorry, but that answer is incorrect.";                
                console.log ("Wrong answser");
                break;
        };
        // debugging statement with the answer chosen.  Not sure why this isn't in the switch statement, honestly.
        console.log("Your answer was: " + this.attributes['myAnswer']);

        // Built the statement
        // the actor is constructed from the user's First name given in the launchIntent function
        // The result is constructed from the answer given in the answerIntent function
        // The timestamp is a bit of a cheat, since this is only one question.
        var stmt = {
            "actor": {
                "mbox": "mailto:" + this.attributes['FirstName'].toLowerCase() + "@devlearn16.com",
                "name": this.attributes['FirstName'],
                "objectType": "Agent"
            },
            "verb": {
                "id": "http://adlnet.gov/expapi/verbs/answered",
                "display": { "en-US": "answered" }
            },
            "object": {
                "id": "http://omnesLRS.com/xapi/quiz_tracker",
                "definition": {
                    "name": { "en-US": "xAPI Video Quiz" },
                    "description": { "en-US": "Correlating quiz answers to video consumption" }
                },
                "objectType": "Activity"
            },
            "result": {
                "response"	: this.attributes['myAnswer'],
                "extensions": {
                    "http://example.com/xapi/location" : "15.6"
                    }
            }
        };

        // Set the LRS endpoint, username and password
        var conf = {
            "url" : "https://lrs.adlnet.gov/xapi/",
            "auth" : {
                user : "xapi-tools",
                pass : "xapi-tools" 
            }
        };
        
          // Tell alexa to use the LRS defined above
        var LRS = new ADL.XAPIWrapper(conf);
                        
        // This sends the statement and delivers the final message to the user.
        // This uses an arrow function as a callback.  This allows us to use "this" 
        // in the global scope.  We also use the arrow function to deliver the final message
        // since otherwise, the skills closes before the asynchronous LRS call can complete,
        // and the Statement is never sent.
        // The ":tell" indicates that the session is over, and no further interactions with the user are expected.
        LRS.sendStatements(stmt, (err, resp, bdy) => {
            console.log('stmnt sent: ' + resp.statusCode);
            this.emit(':tell', this.attributes['message']);
        }); 
    },
};
