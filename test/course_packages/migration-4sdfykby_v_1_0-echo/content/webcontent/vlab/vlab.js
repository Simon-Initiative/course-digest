
/**
*
*/
function startActivity () {
  console.log ("startActivity ()");

  // Make sure our own generated page has no padding or margins
  document.documentElement.style.margin="0px";
  document.documentElement.style.padding="0px";
  var body = document.getElementsByTagName("BODY")[0]; 
  body.style.margin="0px";
  body.style.padding="0px";   

  // inherit css from parent window
  Array.prototype.forEach.call(window.parent.document.querySelectorAll("link[rel=stylesheet]"), function(link) {
        var newLink = document.createElement("link");
        newLink.rel  = link.rel;
        newLink.href = link.href;
        document.head.appendChild(newLink);
  });
  
  // Get a pointer to our API object so that we can interact with the environment
  var superClient=APIActivity.getSuperActivityObject ();

  // Calling this will remove any extraneous margins, padding and borders
  APIActivity.maximizeClientArea ();

  // Define vlab iframe and add to DOM
  const vlabFrame = document.createElement ('iframe');
  vlabFrame.src = APIActivity.getDownloadableResource (APIActivity.getActivityBasepath ()+'webcontent/vlab/vlab/index.html');
  vlabFrame.id = "labframe";
  vlabFrame.width = "99%";
  vlabFrame.height = "700";
  vlabFrame.frameBorder = "0";
  vlabFrame.style = "border-width: 1px; border-style: solid; padding: 0px; margin: 0px;";
  vlabFrame.setAttribute('allowFullScreen', '') 
  if (document.getElementById("vlab")) {
    document.getElementById("vlab").appendChild(vlabFrame);
  } else {
    document.body.appendChild(vlabFrame);
  }

  //Get configuration from embed-activity xml
  var configPath = APIActivity.findResourcesByType("configPath");
  var activityName = APIActivity.findResourcesByType("activityName"); //for vlab logging

  //load activity file
  document.getElementById("labframe").onload = function() {
        document.getElementById("labframe").contentWindow.loadAssignment(configPath);
  };

  // Prep main window to receive log messages from vlab
  window.addEventListener("message", handleVlabMessage, false);
  function handleVlabMessage(){
    APIActivity.logNavigation(activityName, event.data);
  };

  //behavior for feedback closure
  $("#asx_feedback").css("display", "none");
  $(".xBtn").click(function() {
    $(this).parent().css("display", "none");
  });

  //read in hints
  var hintArray = [];
  var hintCounter = 0;

  if (APIActivity.findResourceByType ("hints")) {
    console.log("Getting hints.")
    APIActivity.getFile(APIActivity.findResourceByType ("hints"), "", function(rawXML){
      hintArray = Array.prototype.slice.call( rawXML.getElementsByTagName("hint" )).map(({innerHTML})=>innerHTML);
    });
  } else {
    console.log("No resources of the type 'hints' found.");
  }
  
  //beahvior for vlab hints
  $("#vlab_hints, .prev, .next").click(function(e) {
    console.log("Show hints");

    var content;
    e.preventDefault();
    e.stopPropagation();

    if (RegExp("prev").test(e.target.className)) {
      hintCounter--;
    } else if (RegExp("next").test(e.target.className)) {
      hintCounter++;
    }

    if (hintArray.length > 0) {
      content = "<p>" + hintArray[hintCounter] + "</p>";
      //get path to webContent folder for images
      let regex = /src=['"]/gi;
      content = content.replace(regex, '$&' + APIActivity.getSuperClient().webContentFolder);      
    } else {
      content = "<p>No hints loaded.</p>";
    }
      
    if (hintCounter === 0) {
      $(".prev").css("display", "none");
      $("#hintWindow").css("padding-left", "0")
    } else {
      $(".prev").css("display", "block");
      $("#hintWindow").css("padding-left", "30px")
    }
    
    if (hintCounter + 1  >= hintArray.length) {
      $(".next").css("display", "none");
      $("#hintWindow").css("padding-right", "0")
    } else {
      $(".next").css("display", "block");
      $("#hintWindow").css("padding-right", "30px")
    }
    
    $("#hintWindow").html(content);
    $("#asx_hint").css("display", "block");

    return false;  
  });


};

//feedback 
function showFeedback(results, eval_class) {
  var box = document.getElementById("asx_feedback");
  box.classList.remove("correct");
  box.classList.remove("incorrect");

    //get path to webContent folder for images
  let regex = /src=['"]/gi;
  results = results.replace(regex, '$&' + APIActivity.getSuperClient().webContentFolder);      

  document.getElementById("resultsWindow").innerHTML = "<p>" + results + "</p>";
  box.classList.add(eval_class);
  if (box.style.display === "block") {
    box.classList.remove("fade_me_up");
    void box.offsetWidth;
    box.classList.add("fade_me_up");
  } else {
    box.classList.remove("fade_me_up");
    box.style.display = "block";
  }
};

