// We are grabbing this debouncing function from http://www.paulirish.com/2009/throttled-smartresize-jquery-event-handler/
// We want to ensure that if the user resizes the window, we resize our graph accordingly, but rerendering on every resize event
// will crush the browser. We use this debounce function to ensure that we only rerender, at most, every 100ms.
//
(function($,sr){

  // debouncing function from John Hann
  // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
  var debounce = function (func, threshold, execAsap) {
      var timeout;

      return function debounced () {
          var obj = this, args = arguments;
          function delayed () {
              if (!execAsap)
                  func.apply(obj, args);
              timeout = null;
          };

          if (timeout)
              clearTimeout(timeout);
          else if (execAsap)
              func.apply(obj, args);

          timeout = setTimeout(delayed, threshold || 100);
      };
  }
  // smartresize
  jQuery.fn[sr] = function(fn){  return fn ? this.bind('resize', debounce(fn)) : this.trigger(sr); };

})(jQuery,'smartresize');


$(function() {
  // Grades is our data set, and we initially set our binWidth to 10. In addition, we define the lowest point to be rendered
  // on our graph as 40, and our max point at 120.
  //
  var grades = [49, 51, 57, 60, 63, 65, 69, 71, 72, 73, 74, 75, 79, 85, 88, 97];
  var binWidth = 10;
  var minBin = 40;
  var maxBin = 120;
  var x, x2, xAxis;

  // These values are used when rendering the graph, the margins allow for space for rendering the axis text.
  // The maximum width we want to render is 960 px, otherwise we'll se it to a bit below the size of the window.
  // This function will also get called if the user resizes the window, we add that handler at the end of this
  // file.
  //
  // This also needs to setup the various scales we use for the x axis, so we're going to set the values of those
  // in this function also.
  //
  var checkWidth = function() {
    var maxWidth = 960;
    if (window.innerWidth < maxWidth) {
      maxWidth = window.innerWidth;
    }
    width = (maxWidth - margin.left - margin.right);

    // This just creates a linear scale from 0 to the our 'max' point. You'll see that we're going from 0 to (max - min),
    // this is because d3 requires these to start at 0 rather than our actual start point. Range is used to determine the
    // output range, so from 0 pixels to the width of our graph minus margins.
    //
    x = d3.scale.linear()
      .domain([0, (maxBin - minBin)])
      .range([0, width]);

    // This linear scale is used to draw the graph, here we pass our real domain values so that the rendered graph displays
    // 40 - 120 instead of 0 - 80
    //
    x2 = d3.scale.linear()
      .domain([minBin, maxBin])
      .range([0, width]);

    // We define our axises here, passing in the scales we just created and orienting them to the bottom and left respectively.
    //
    xAxis = d3.svg.axis()
      .scale(x2)
      .orient('bottom');
  }

  var margin = {top: 10, right: 30, bottom: 30, left: 30};
  var height = 400 - margin.top - margin.bottom;
  checkWidth();

  // Now we're going to define the other sets of data we need for d3 to render our graphs properly.
  //
  // Same deal here, defining our y graph instead. Our domain is hardcoded at 0 to 10, which is how the CDF version was built.
  // Since we render elements with a 'top' point, we want our range to start at the topmost point and work to 0.
  // Also, we can reuse this same linear scale for rendering our axis text since we're just using 0 - 10 here directly.
  //
  var y = d3.scale.linear()
    .domain([0, 10])
    .range([height, 0]);

  var yAxis = d3.svg.axis()
    .scale(y)
    .ticks(10)
    .orient('left');

  // Grab references to each of our elements upfront, since they won't change.
  //
  var $sliderInput = $('input#bin-slider');
  var $individualGradeToggle = $('input#show-grades');
  var $binDisplay = $('span#binwidth-display');
  var $buttons = $('.binwidth.button');

  // This function will handle all of the rendering, and updating of our display.
  //
  var updateDisplay = function() {
    // First, we'll make sure that the display, selector, and buttons are all showing the same info
    //
    $sliderInput.val(binWidth);
    $binDisplay.html(binWidth);
    $buttons.removeClass('active');
    $('button[data-value="' + binWidth + '"]').addClass('active');

    // To properly emulate the existing Java applet, we set thresholds, this ensures that the first bin
    // always starts right at 40, and goes to the specified width.
    // Normally I'd use something like underscore's range for this, but I don't want to add any
    // unnecessary dependencies.
    //
    var thresholds = [0, (binWidth)];
    while (thresholds[thresholds.length - 1] < (maxBin - minBin)) {
      thresholds.push(thresholds[thresholds.length - 1] + binWidth);
    }

    // First, clear out anything existing so we aren't overlapping displays
    //
    d3.select('svg').selectAll('*').remove();

    // Everything here is 0 based as well, so we're going to map over our grades before
    // passing them into the bins function to reduce them by whatever our minBin is set to.
    //
    var data = d3.layout.histogram()
        .bins(thresholds)(grades.map(function(elem) { return elem - minBin }));

    // Now we make sure our graph is rendered the correct size, and in the correct place before
    // populating it. Since d3 renders SVGs, we need to add a group element to it to render items into.
    //
    var svg = d3.select("svg.graph")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Here, we will iterate over our data (which was generated by the histogram call above,
    // creating new group elements, and translating them into place and assigning them the
    // class of bar. This will return the set of groups to be populated in the next call.
    //
    var bar = svg.selectAll(".bar")
      .data(data)
      .enter().append("g")
      .attr("class", "bar")
      .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });

    // Now we append 'rect' elements into each of the 'g' elements we just generated. Width is generated
    // by the histogram call, so we just fetch it out and subtract 1 from it to allow bars to have a bit
    // of room between them. The histogram call also gives the y coordinate for the top of the bar, so
    // we can determine the height by subtracting it from the height of the graph.
    //
    bar.append("rect")
      .attr("x", 1)
      .attr("width", x(data[0].dx) - 1)
      .attr("height", function(d) { return height - y(d.y); });

    // Lastly, we will append our axises on the bottom and the left of the graph.
    //
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    svg.append('g')
      .attr('class', 'y axis')
      .attr('transform', 'translate(0,0)')
      .call(yAxis);
  }


  var renderIndividualGrades = function() {
    // In this case, we want to render based on number of bins, and we want 1 bin for every potential point on the graph.
    //
    var bins = (maxBin - minBin);

    var data = d3.layout.histogram()
      .bins(x.ticks(bins))(grades.map(function(elem) { return elem - minBin }));

    var svg = d3.select("svg.individual-numbers")
      .attr("width", width + margin.left + margin.right)
      .attr("height", 50)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var bar = svg.selectAll(".bar")
      .data(data)
      .enter().append("g")
      .attr("class", "number")
      .attr("transform", function(d) { return "translate(" + x(d.x) + ",5)"; });

    bar.append("circle")
      .attr("x", 1)
      .attr("r", function(d) { return d.y * 2; });
  };

  var hideIndividualGrades = function() {
    // To hide the individual grades, we just remove all the elements inside our SVG container.
    //
    d3.select('svg.individual-numbers').selectAll('*').remove();
  };


  // Whenever a user changes the inputs, we want the other input to update, so we add an event handler for change to our input,
  // and handle clicks on the buttons we've rendered for the other selector.
  //
  $sliderInput.on('input', function(e) {
    // Values are always returned as strings, so we have to conver them to integers:
    //
    binWidth = parseInt(e.target.value, 10);
    updateDisplay();
  });

  $buttons.on('click', function(e) {
    binWidth = parseInt($(e.target).data('value'), 10);
    updateDisplay();
  });

  $individualGradeToggle.on('change', function(e) {
    // If the end result is a checked checkbox, we render the individual grade points, otherwise hide them.
    //
    if ($(e.target).prop('checked')) {
      renderIndividualGrades();
    } else {
      hideIndividualGrades();
    }
  });

  // Lastly, if someone resizes the window, we want to handle this case and resize our contents as well.
  // If the resized body is the same width, we won't do anything to ensure we aren't redrawing unnecessarily.
  //
  $(window).smartresize(function() {
    var curWidth = width;
    checkWidth();
    if (curWidth != width) {
      updateDisplay();
    }
  });

  // Finally, we will render the display when the page loads by calling our update display function:
  //
  updateDisplay();
});
