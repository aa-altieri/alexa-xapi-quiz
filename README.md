# Sending xAPI Statements from an Alexa Skill

Alexa is the voice-based assistant from Amazon, used on the Echo devices.  It allows the user to interact with various services completely using a voice-based interface.  For example, you can say "Alexa, what is the weather today?" The device will then respond by telling you what the weather report for that area is.  It's pretty nice, actually.

It also creates new opportunities for delivery of learning and performance support activities.  And, as usual, we want to track how users do on those activities.  Once again, xAPI to the rescue!  Just as you'd send xAPI statements for quiz answers or other interactions on a web page, you can likewise capture quiz performance from Alexa quizzes or whatever else you can imagine.  As long as there is a triggering event (answering a question, requesting a specific skill, etc...) you can send a statement.  In this very simple quiz example, I'll attempt to demonstrate the process.

### What I will and won't discuss
In this README, I'll discuss the steps to create and send the xAPI statement from within the Alexa Skill.  I'll also discuss a little bit of the environment setup, because you DO need to run another command to get the xAPI ADL wrapper for Node.JS.  

I will NOT discuss setting up the skill (creating the slots, intents, etc...) or a detailed walk through of how skills work.  I will mention a few things along the way that are important because we want to send the statement.  But otherwise, I'll assume you know the basics of creating and setting up Alexa Skills.

### Setting up your environment
This repo has everything you need to load a skill and go to town.  But, if you want to build from scratch, there are a few things you'll need.  They are easily acquired. In fact, it's two commands in most cases.

Create the directory for your source files.  In a command line, navigate to that directory.  The first thing you'll need is the Alexa SDK.  You can install that by typing the command:
```
npm install --save alexa-sdk
```

This will install the files you need to interact with the Alexa voice services.

To use the ADL xAPI node wrapper, you'll need to issue this command in addition to the above:

```
npm install adl-xapiwrapper
```

This will install the xAPI wrapper for node.js.  With this file installed, you can build and send the xAPI statement MUCH easier.  I'll walk through that process as we look at the code.  One thing you'll find:  As with most things xAPI, it all comes back to four lines of code!  I know, I say that a lot.  But it's true.  xAPI is much easier than most people think.

### Building the "Quiz"
OK, this quiz sucks.  I know.  It's a single question about what you would see in the first 16 seconds of the video [Big Buck Bunny](https://peach.blender.org/download/).  The idea is to isolate the xAPI statement process to show how that can work.  So let's look at the code:

```
'LaunchRequest': function() { //Executes when a new session is launched
    this.emit('LaunchIntent');
},

'LaunchIntent': function() { // Ask the user his/her name
    this.emit(':ask', "Hello!  Welcome to the DevLearn example quiz!  " +
        "This quiz will test your knowledge of the Big Buck Bunny video.  " +
        "Before we begin, may I ask your name?");
},
```

When you invoke the name of the skill by saying "Alexa, open whatever my skill is named,"  the ```LaunchRequest``` function is run.  In this case, it runs the ```LaunchIntent``` function.

The ```LaunchRequest``` function introduces the skill.  In this case, it also asks the user's name.  We'll use the name for the xAPI statement a little later.

The next bit of code, the ```NameIntent``` function, should be called once the user says his or her name.  The first thing it does is ask the user the question:

```
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
```
In theory, the user will give the number of the chosen answer.  When the user says the number, the next ```AnswerIntent``` function is called.  I won't post the entire code of that function here.  But it first uses a switch case to set the chosen answer, if it was the right or wrong answer, and the message that will be given to the student and assigns those to attributes of the skill itself.  

And now... the fun bits!  First, we define the statement:

```
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
```

As you would with normal javascript, we're simply building the actor mbox string by adding the ```FirstName``` attribute.  The response is simply a keyed pair using the myAnswer attribute of the skill.  Again, very similar to the way you'd do this in a normal web page using javascript.  You could replace any of the hardcoded values with environmental variables or whatever else you may have to make the process more automated.

The next thing is to set up the LRS endpoints and credentials:  

```
// Set the LRS endpoint, username and password
var conf = {
    "url" : "https://lrs.adlnet.gov/xapi/",
    "auth" : {
        user : "xapi-tools",
        pass : "xapi-tools"
    }
};
```
Next, we tell the Alexa skill to use the LRS we just set up:

```
// Tell alexa to use the LRS defined above
var LRS = new ADL.XAPIWrapper(conf);
```
Now we send the statement!  
```                
LRS.sendStatements(stmt, (err, resp, bdy) => {
    console.log('stmnt sent: ' + resp.statusCode);
    this.emit(':tell', this.attributes['message']);
});
```

It's just that eas... yeah, of course it's not that easy!  Let's take a look at everything that's going on here.  Cause it's more than you might think.

First, we make the call to ```LRS.sendStatement```.  The arguments we send are the statement, and a [callback function](http://callbackhell.com/).  Basically, a callback function is a function that gets run once the calling function is completed doing whatever it's trying to do.  In this case, once the once the statement is sent, it then calls the "callback" function.  In this example, we're adding another twist because we're not calling the normal anonymous function here, we're using an [arrow function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions).  The arrow function doesn't bind its own ```this```.  That means, it's easier to pull the skill's attributes without having to deal with scope issues.

But the biggest issue is with TIMING.  Sending the statement, then waiting for the statement ID to get returned, can take upwards of two to three seconds in an Alexa skill.  The problem is that the skill will run the ```sendStatement``` function, and then move on to the rest of the code and exit, before the statement ID is returned.  So part of the callback function is the last ```this.emit```.  In this case, we're sending a ```:tell``` that tells the system that no further interactions are expected.  This will close the session and end the skill.  This way, we basically hold the session open until the statement is sent, the statement ID is returned, and the callback is called.

### Aaaaannnd... it's just THAT easy.  
OK, so... it's not as entirely straightforward as it could have been.  But really, with only one or two catches, it is pretty easy to send xAPI statements from within a skill.  And that opens a LOT of possibilities to use Alexa for any number of performance support, training, or even the simple occasional microlearning reminder.  


### Don't do as I do... here, anyway
Alexa skills don't run in a linear fashion the way most javascript programs run.  Even when looking at things asynchronously, Alexa doesn't run the same way.  The different functions aren't called based on execution.  They are called based on what the user says.  so in the case of this example, when the skills asks for the users name, if the user just says "three", the skill will hear that, interpret it as a number (answer to the quiz question), and then send the statement with the ```FirstName``` attribute undefined.  In this example, I've REALLY stripped out as much as possible to isolate and illustrate how to send the statement.  In the real world, you would need to add some fault tollerances and error checking to ensure things like this don't happen.  Or any number of other things I've either ignored, forgotten about, or intentionally excluded.

### Now it's your turn!
So, I've shown you how to set up and send an xAPI statement.  Now, show me what you can do with it!  Show me all the ways you can use Alexa to support your students, employees, co-workers, whatever else.  And, if you have any questions, you know where to find me!
