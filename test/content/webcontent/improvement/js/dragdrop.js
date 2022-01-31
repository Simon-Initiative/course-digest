/* 
 * @(#)dragdrop.js $Date: 2015/00/18 
 * 
 * Copyright (c) 2015 Carnegie Mellon University.
 */

define(function () {
    function DragDrop() {
        var title = null, assets = {}, questionList = {}, answerList = {}, feedbackList = {}, hintsList = {}, questionsSaveData = new SaveData();
        this.currentQuestion = null;
        this.currentPart = null;
        var superClient = null;
        this.init = function (sSuperClient, activityData) {
            superClient = sSuperClient;
            title = $(activityData).find("title").text();
            $(activityData).find("assets").children("asset").each(function (index) {
                console.log("asset name " + $(this).attr("name") + " value " + $(this).text());
                assets[$(this).attr("name")] = $(this).text();
            });
            dndActivity.render();
        };
        this.resizeIframe = function () {
            //console.log("body height" +window.frameElement.document.body.scrollHeight);
            console.log("body height " + $('body').prop("scrollHeight"));
        };
        this.render = function () {
            $("<link/>", {
                rel: "stylesheet",
                type: "text/css",
                href: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css'
            }).appendTo("head");
            $("<link/>", {
                rel: "stylesheet",
                type: "text/css",
                href: 'https://code.jquery.com/ui/1.11.4/themes/smoothness/jquery-ui.css'
            }).appendTo("head");
            $("<link/>", {
                rel: "stylesheet",
                type: "text/css",
                href: superClient.webContentFolder + assets.dndstyles
            }).appendTo("head");
            $("<script/>", {
                type: "text/javascript",
                src: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js'
            }).appendTo("head");

            $.get(superClient.webContentFolder + assets.layout, function (layout) {
                $('#oli-embed').append(layout);
            });
            $.get(superClient.webContentFolder + assets.questions, function (data) {
                $(data).find("question").each(function (q) {
                    $(this).find("part").each(function (e) {
                        var answers = {};
                        $(this).find("answer").each(function (e) {
                            answers[$(this).attr("id")] = {id: $(this).attr("id"), score: $(this).attr('score'), answer: $(this).text()};
                        });
                        answerList[$(this).attr("id")] = answers;
                        var hints = {};
                        $(this).find("hint").each(function (e) {
                            hints[$(this).attr("id")] = {id: $(this).attr("id"), content: $(this).text()};
                        });
                        hintsList[$(this).attr("id")] = hints;
                        var feedbacks = {};
                        $(this).find("feedback").each(function (e) {
                            feedbacks[$(this).attr("id")] = {id: $(this).attr("id"), content: $(this).text(), pattern: $(this).attr("match")};
                        });
                        feedbackList[$(this).attr("id")] = feedbacks;
                    });
                });
                dndActivity.loadControls();
            });

        };
        this.loadControls = function () {
            $.get(superClient.webContentFolder + assets.controls, function (controls) {
                $(document.body).append(controls);
                $("#save_btn").click(function () {
                    dndActivity.save();
                });
                $("#submit_btn").click(function () {
                    dndActivity.submit();
                });
                $("#hint_btn").click(function () {
                    dndActivity.hint();
                });
                $("#next_btn").click(function () {
                    dndActivity.nextAttempt();
                });

                dndActivity.processLayout();
                dndActivity.restoreSavedFile();
            });
        };
        this.processLayout = function () {
            $(".question").each(function () {
                var question = new Question($(this).attr('id'), $(this).find('.prompt').text());
                var questionData = new QuestionData(question.getId());
                questionsSaveData.addQuestionData(questionData);
                $(this).find('.target').each(function () {
                    var partId = $(this).attr('id');
                    console.log("Part id " + partId);
                    var part = new Part(partId, 'dnd_target', $(this));
                    if (feedbackList.hasOwnProperty(partId)) {
                        var feedbacks = feedbackList[partId];
                        for (var key in feedbacks) {
                            if (feedbacks.hasOwnProperty(key)) {
                                part.addFeedback(feedbacks[key]);
                            }
                        }
                    }
                    if (hintsList.hasOwnProperty(partId)) {
                        var hints = hintsList[partId];
                        for (var key in hints) {
                            if (hints.hasOwnProperty(key)) {
                                part.addHint(hints[key]);
                            }
                        }
                    }

                    question.addInput(part);
                    var input = {id: '_blank', value: '_blank'};
                    var partData = new PartData(partId, input);
                    var bAnswer = dndActivity.findAnswerForInput(partId,input.id.toLowerCase());
                    if (bAnswer !== null) {
                        partData.setCorrect(true);
                        partData.setScore(Number(bAnswer.score));
                    } else {
                        partData.setCorrect(false);
                        partData.setScore(0);
                    }
                    questionData.addPartData(partData);
                    partData.setFeedback(part.getFeedbackForAnswerId(input.id));
                    if (typeof (currentPart) === "undefined" || currentPart === null) {
                        currentPart = part;
                    }
                });
                questionList[question.getId()] = question;
                if (typeof (currentQuestion) === "undefined" || currentQuestion === null) {
                    currentQuestion = question;
                }
                $(this).append('<div id="' + questionData.getId() + '_feedback" class="feedback"><p style="font-weight: bold;">' +
                        ' Feedbacks</p></div>');
                $(this).append('<div id="' + questionData.getId() + '_hints" class="hints"><p style="font-weight: bold;">' +
                        'Hints</p><div class="content"/><a class="next" href="javascript();">Next</a></div>');
                $('#' + questionData.getId() + '_hints').find('.next').click(function (e) {
                    e.preventDefault();
                    dndActivity.hint();
                });
            });
            $('.target').click(function () {
                var partId = $(this).attr('id');
                $.each(questionList, function (index, value) {
                    var part = value.getPart(partId);
                    if (part !== null) {
                        currentPart = part;
                        currentQuestion = value;
                        dndActivity.controls();
                    }
                });
            });
        };

        this.restoreSavedFile = function () {
            console.log("restoreData()");
            if (typeof (superClient.currentAttempt) !== "undefined" && superClient.currentAttempt !== null
                    && superClient.currentAttempt !== 'none') {
                if (superClient.fileRecordList.hasOwnProperty('student_save_file' + superClient.currentAttempt)) {
                    superClient.loadFileRecord('student_save_file', superClient.currentAttempt, function (response) {
                        console.log("student_save_file Data response: " + response);

                        $(response).find('save_data').find('question').each(function (e) {
                            var questionId = $(this).attr('id');
                            console.log("restore id " + questionId);
                            var questionData = new QuestionData(questionId);
                            if ($(this).attr('score')) {
                                console.log("restore score " + $(this).attr('score'));
                                questionData.setScore(Number($(this).attr('score')));
                            }
                            var oneNotCorrect = false;
                            $(this).find('part').each(function (i) {
                                console.log("restore part id " + $(this).attr('id'));
                                console.log("restore part input " + $(this).find('input').text());
                                var input = {id: $(this).find('input').attr('id'), value: $(this).find('input').text()};
                                var partId = $(this).attr('id');
                                var partData = new PartData(partId, input);
                                var partCorrect = $(this).attr('correct') === 'true';
                                if (partCorrect) {
                                    partData.setCorrect(true);
                                } else {
                                    oneNotCorrect = true;
                                    partData.setCorrect(false);
                                }
                                partData.setScore(Number($(this).attr('score')));
                                if ($(this).find('feedback')) {
                                    var feedback = {id: $(this).find('feedback').attr("id"), content: $(this).find('feedback').text()};
                                    partData.setFeedback(feedback);
                                }
                                if ($(this).find('hint')) {
                                    var hint = {id: $(this).find('hint').attr("id"), content: $(this).find('hint').text()};
                                    partData.setHint(hint);
                                }
                                questionData.addPartData(partData);
                                $('.choices').each(function () {
                                    if ($(this).attr('data-value') === input.value) {
                                        var target = $('.target').filter('[id=' + partId + ']');
                                        target.oldParent = target.parent();
                                        $(this).appendTo(target);
                                        if (superClient.isCurrentAttemptCompleted()) {
                                            if (partData.getCorrect()) {
                                                target.parent().css('border-color', 'green');
                                            } else {
                                                target.parent().css('border-color', 'red');
                                            }
                                        }
                                        return false;
                                    }
                                });
                                if (superClient.isCurrentAttemptCompleted()) {
                                    var borderColor = partCorrect?'style="border-color:#33aa33;"':'style="border-color:#e75d36;"';
                                    var pId = partData.getId();
                                    $('#' + questionData.getId() + '_feedback').append('<div style="display: inline-block;"><div class="circleBase type1" '+borderColor+'>' +
                                            pId.substring(pId.lastIndexOf("_") + 1, pId.length) + ' </div><div style="display: inline-block;padding-left:25px;">' + partData.getFeedback().content + '</div></div>');
                                }
                            });
                            if (superClient.isCurrentAttemptCompleted()) {
                                if (oneNotCorrect) {
                                    var styles = {
                                        background: '#f4cfc9',
                                        borderColor: '#e75d36',
                                        display: 'block'
                                    };
                                    $('#' + questionData.getId() + '_feedback').css(styles);
                                } else {
                                    var styles = {
                                        background: '#ddffdd',
                                        borderColor: '#33aa33',
                                        display: 'block'
                                    };
                                    $('#' + questionData.getId() + '_feedback').css(styles);
                                }
                            }
                            questionsSaveData.addQuestionData(questionData);
                        });
                        dndActivity.controls();
                    });
                } else {
                    dndActivity.controls();
                }
                var completed = superClient.isCurrentAttemptCompleted();
                if (!completed) {
                    dndActivity.makeActivityIntoDnD();
                }
            }
        };
        this.showFeedback = function () {
            var questionsData = questionsSaveData.getQuestionsData();
            for (var key in questionsData) {
                if (questionsData.hasOwnProperty(key)) {
                    var qd = questionsData[key];
                    var partsData = qd.getPartsData();
                    var oneNotCorrect = false;
                    for (var k in partsData) {
                        if (partsData.hasOwnProperty(k)) {
                            var pd = partsData[k];
                            var target = $('.target').filter('[id=' + pd.getId() + ']');
                            if (pd.getCorrect()) {
                                target.parent().css('border-color', 'green');
                            } else {
                                oneNotCorrect = true;
                                target.parent().css('border-color', 'red');
                            }
                            var pId = pd.getId();
                            var borderColor = pd.getCorrect()?'style="border-color:#33aa33;"':'style="border-color:#e75d36;"';
                            $('#' + qd.getId() + '_feedback').append('<div style="display: inline-block;"><div class="circleBase type1" '+borderColor+'>' +
                                    pId.substring(pId.lastIndexOf("_") + 1, pId.length) + ' </div><div style="display: inline-block;padding-left:25px;">' + pd.getFeedback().content + '</div></div>');

                        }
                    }
                    if (oneNotCorrect) {
                        var styles = {
                            background: '#f4cfc9',
                            borderColor: '#e75d36',
                            display: 'block'
                        };
                        $('#' + qd.getId() + '_feedback').css(styles);
                    } else {
                        var styles = {
                            background: '#ddffdd',
                            borderColor: '#33aa33',
                            display: 'block'
                        };
                        $('#' + qd.getId() + '_feedback').css(styles);
                    }
                }
            }
        };
        this.makeActivityIntoDnD = function () {
            console.log("makeActivityIntoDnD");
            var z = 10;
            $('.choices').draggable({
                containment: '.question',
                revert: function (event, ui) {
                    return !event;
                },
                drag: function (event, ui) {
                    $(this).css("z-index", z += 10);
                }
            });
            //stores a reference to the original parent
            $('.choices').each(function () {
                $(this).attr('parent_id', $(this).parent().attr('id'));
            });

            $('.target').droppable({
                hoverClass: "ui-state-hover",
                drop: function (event, ui) {
                    var input = {id: ui.draggable.attr('id'), value: ui.draggable.attr('data-value')};
                    console.log("Input value " + input);
                    var partId = $(this).attr('id');
                    var dropped = ui.draggable;
                    //move previously dropped choice, if any, to original parent
                    $('#' + partId).children().each(function () {
                        $(this).detach().css({top: 0, left: 0}).appendTo('#' + $(this).attr('parent_id'));
                    });
                    $(dropped).detach().css({top: 0, left: 0}).appendTo($('#' + partId));
                    var qId = partId.substring(0, partId.indexOf("_"));
                    console.log("qId and partId " + qId + " " + partId);
                    var question = questionList[qId];
                    var part = question.getPart(partId);
                    var questionData = questionsSaveData.getQuestionData(qId);
                    if (questionData === null) {
                        questionData = new QuestionData(qId);
                        questionsSaveData.addQuestionData(questionData);
                    }
                    var partsData = questionData.getPartsData();
                    // if the value has been previously dropped into another part
                    // find it and remove it first
                    var pdFound = null;
                    for (var k in partsData) {
                        if (partsData.hasOwnProperty(k)) {
                            var pd = partsData[k];
                            if (pd.getInput().id === input.id) {
                                pdFound = pd;
                                break;
                            }
                        }
                    }
                    if (pdFound !== null) {
                        //delete partsData[pdFound.getId()];
                        var blankInput = {id: '_blank', value: '_blank'};
                        pdFound.setInput(input);
                        var bAnswer = dndActivity.findAnswerForInput(pdFound.getId(),blankInput.id.toLowerCase());
                        if (bAnswer !== null) {
                            pdFound.setCorrect(true);
                            pdFound.setScore(Number(bAnswer.score));
                        } else {
                            pdFound.setCorrect(false);
                            pdFound.setScore(0);
                        }
                        pdFound.setFeedback(part.getFeedbackForAnswerId(input.id));
                    }
                    var partData = questionData.getPartData(partId);
                    var answer = dndActivity.findAnswerForInput(partId,input.id.toLowerCase());
                    if (partData === null) {
                        partData = new PartData(partId, input);
                        if (answer!== null) {
                            partData.setCorrect(true);
                            partData.setScore(Number(answer.score));
                        } else {
                            partData.setCorrect(false);
                            partData.setScore(0);
                        }
                        questionData.addPartData(partData);
                    } else {
                        partData.setInput(input);
                        if (answer!== null) {
                            partData.setCorrect(true);
                            partData.setScore(Number(answer.score));
                        } else {
                            partData.setCorrect(false);
                            partData.setScore(0);
                        }
                    }
                    // Set feedback appropriate for this input
                    console.log("Feedback of input " + input.id + " " + part.getFeedbackForAnswerId(input.id));
                    partData.setFeedback(part.getFeedbackForAnswerId(input.id));
                    dndActivity.controls();

                    var action = new ActionLog(CommonLogActionNames.START_STEP, superClient.sessionId, superClient.resourceId, superClient.activityGuid, "EMBEDED_ACTIVITY", superClient.timeZone);
                    // Important: allows dashboard tracking
                    var supplement = new SupplementLog();
                    supplement.setAction(CommonLogActionNames.START_STEP_TRACK);
                    supplement.setSource(qId);
                    supplement.setInfoType(partId);
                    supplement.setInfo("step started");
                    action.addSupplement(supplement);
                    superClient.logAction(action);
                }
            });
        };
        this.findAnswerForInput = function (partId, input) {
            var answers = answerList[partId];
            if (answers) {
                for (var k in answers) {
                    if (answers.hasOwnProperty(k)) {
                        var ans = answers[k];
                        console.log("Answer for part "+ partId + " equals " + ans.answer.toLowerCase());
                        if (ans.answer.toLowerCase() === input) {
                            console.log("Answer for part "+ partId + " found " + ans.answer.toLowerCase());
                            return ans;
                        }
                    }
                }
            }
            return null;
        };
        this.controls = function () {
            console.log("controls()");
            var completed = superClient.isCurrentAttemptCompleted();
            if (completed) {
                $('#save_btn').addClass('disabled');
                $('#submit_btn').addClass('disabled');
                $('#hint_btn').addClass('disabled');
                $('#next_btn').removeClass('disabled');
            } else {
                if (questionsSaveData.numberOfQuestionsAnswered() > 0) {
                    $('#save_btn').removeClass('disabled');
                    $('#submit_btn').removeClass('disabled');
                } else {
                    $('#save_btn').addClass('disabled');
                    $('#submit_btn').addClass('disabled');
                }
                if (typeof (currentPart) === "undefined" || currentPart === null || currentPart.getHints().length === 0) {
                    $('#hint_btn').addClass('disabled');
                }else{
                    $('#hint_btn').removeClass('disabled');
                }
                $('#next_btn').addClass('disabled');
            }
            if(superClient.maxAttempts > 0 && superClient.maxAttempts <= Number(superClient.currentAttempt)){
                $('#next_btn').addClass('disabled');
            }
        };
        this.save = function () {
            console.log("save()");
            if (superClient.isCurrentAttemptCompleted()) {
                return;
            }
            var xml = questionsSaveData.toXML();
            var saveData = (new XMLSerializer()).serializeToString(xml.context);
            console.log("save() " + saveData);
            superClient.writeFileRecord('student_save_file', 'text/xml', superClient.currentAttempt, saveData, function (response) {
                console.log("WriteFileRecord Data server response: " + response);
            });
            var action = new ActionLog(CommonLogActionNames.SAVE_ATTEMPT, superClient.sessionId, superClient.resourceId, superClient.activityGuid, "EMBEDED_ACTIVITY", superClient.timeZone);
            var supplement = new SupplementLog();
            supplement.setAction(CommonLogActionNames.SAVE_ATTEMPT);
            supplement.setInfoType('attempt');
            supplement.setInfo(superClient.currentAttempt);
            action.addSupplement(supplement);
            superClient.logAction(action);
        };
        this.submit = function () {
            console.log("submit()");
            if (superClient.isCurrentAttemptCompleted()) {
                return;
            }
            // Only score attempt if at least 1 question has been answered
            if (questionsSaveData.numberOfQuestionsAnswered() < 1) {
                console.log("scoreAttempt() no questions answered ");
                return;
            }
            dndActivity.saveDataAndScore();
        };
        this.saveDataAndScore = function () {
            var attemptScore = questionsSaveData.getAttemptScore();
            var xml = questionsSaveData.toXML();
            var saveData = (new XMLSerializer()).serializeToString(xml.context);
            console.log("saveDataAndScore() " + saveData);
            // Saves current data before scoring the attempt
            superClient.writeFileRecord('student_save_file', 'text/xml', superClient.currentAttempt, saveData, function (response) {
                console.log("WriteFileRecord Data server response: " + response);
                dndActivity.scoreAttempt(attemptScore);
            });
        };
        this.scoreAttempt = function (attemptScore) {
            console.log("scoreAttempt() score " + attemptScore);
            superClient.scoreAttempt('percent', attemptScore, function (response) {
                console.log("scoreAttempt() server response " + response);
                superClient.endAttempt(function (endAttemptResponse) {
                    console.log("scoreAttempt() endAttempt server response" + endAttemptResponse);
                    superClient.processStartData(endAttemptResponse);
                    dndActivity.showFeedback();
                    dndActivity.controls();
                    dndActivity.resizeIframe();
                });
            });

            //Log the submit action
            var action = new ActionLog(CommonLogActionNames.SUBMIT_ATTEMPT, superClient.sessionId, superClient.resourceId, superClient.activityGuid, "EMBEDED_ACTIVITY", superClient.timeZone);
            var questionsData = questionsSaveData.getQuestionsData();
            for (var key in questionsData) {
                if (questionsData.hasOwnProperty(key)) {
                    var q = questionsData[key];
                    var supplement = new SupplementLog();
                    supplement.setAction(CommonLogActionNames.SCORE_QUESTION);
                    supplement.setInfoType(q.getId());
                    supplement.setInfo(q.getScore());
                    action.addSupplement(supplement);
                    supplement = new SupplementLog();
                    supplement.setAction(CommonLogActionNames.SCORE_QUESTION);
                    supplement.setInfoType('attempt');
                    supplement.setInfo(superClient.currentAttempt);
                    action.addSupplement(supplement);
                    var partsData = q.getPartsData();
                    for (var key in partsData) {
                        if (partsData.hasOwnProperty(key)) {
                            var p = partsData[key];
                            supplement = new SupplementLog();
                            supplement.setAction(CommonLogActionNames.EVALUATE_RESPONSE);
                            supplement.setInfoType(p.getId());
                            supplement.setInfo("<![CDATA[" + p.getInput() + "]]>");
                            action.addSupplement(supplement);

                            // Important: allows dashboard tracking
                            supplement = new SupplementLog();
                            supplement.setAction(CommonLogActionNames.EVALUATE_RESPONSE_TRACK);
                            supplement.setSource(q.getId());
                            supplement.setInfoType(p.getId());
                            supplement.setInfo(p.getCorrect());
                            action.addSupplement(supplement);

                            supplement = new SupplementLog();
                            supplement.setAction(CommonLogActionNames.MARK_CORRECT);
                            supplement.setInfoType(q.getId() + '/' + p.getId());
                            supplement.setInfo(p.getCorrect());
                            action.addSupplement(supplement);

                            if (p.getFeedback() !== null) {
                                supplement = new SupplementLog();
                                supplement.setAction(CommonLogActionNames.SET_AUTOMATIC_OUTCOME);
                                supplement.setInfoType(p.getId());
                                supplement.setInfo("<![CDATA[" + p.getFeedback() + "]]>");
                                action.addSupplement(supplement);
                            }
                        }
                    }
                }
            }
            superClient.logAction(action);
        };
        this.hint = function () {
            console.log("hint()");
            if (superClient.isCurrentAttemptCompleted()) {
                return;
            }
            if (typeof (currentPart) === "undefined" || currentPart === null || currentPart.getHints().length === 0) {
                return;
            }

            if (typeof (currentPart.hintCnt) === "undefined" || currentPart.hintCnt === null) {
                currentPart.hintCnt = 0;
            }

            if (currentPart.hintCnt >= currentPart.getHints().length) {
                currentPart.hintCnt = 0;
            }
            var hint = currentPart.getHints()[currentPart.hintCnt];
            currentPart.hintCnt++;
            if (questionsSaveData.getQuestionData(currentQuestion.getId())) {
                var pd = questionsSaveData.getQuestionData(currentQuestion.getId())
                        .getPartData(currentPart.getId());
                if (pd) {
                    pd.setHint(hint);
                }
            }
            var action = new ActionLog(CommonLogActionNames.VIEW_HINT, superClient.sessionId, superClient.resourceId, superClient.activityGuid, "EMBEDED_ACTIVITY", superClient.timeZone);
            var supplement = new SupplementLog();
            supplement.setAction(CommonLogActionNames.VIEW_HINT);
            supplement.setInfoType(currentPart.getId());
            supplement.setInfo("<![CDATA[" + hint.content + "]]>");
            action.addSupplement(supplement);
            var supplement = new SupplementLog();

            // Important: allows dashboard tracking
            supplement.setAction(CommonLogActionNames.VIEW_HINT_TRACK);
            supplement.setSource(currentQuestion.getId());
            supplement.setInfoType(currentPart.getId());
            supplement.setInfo("<![CDATA[" + hint.content + "]]>");
            action.addSupplement(supplement);
            superClient.logAction(action);
            $('#' + currentQuestion.getId() + '_hints').find('.content').children().each(function () {
                $(this).remove();
            });
            var pId = currentPart.getId();
            $('#' + currentQuestion.getId() + '_hints').find('.content').append('<div style="display: inline-block;"><div class="circleBase type1">' +
                    pId.substring(pId.lastIndexOf("_") + 1, pId.length) + ' </div><div style="display:inline-block;padding-left:25px;">' + hint.content + '</div></div>');
            $('#' + currentQuestion.getId() + '_hints').css('display', 'block');
            console.log("hint content " + hint.content);
            $('.target').each(function () {
                $(this).parent().removeClass('hint_animate');
            });
            var target = $('.target').filter('[id=' + currentPart.getId() + ']');
            target.parent().addClass('hint_animate');
            dndActivity.resizeIframe();
        };
        this.nextAttempt = function () {
            console.log("nextAttempt()");
            if (superClient.isCurrentAttemptCompleted()) {
                console.log("nextAttempt() requested");
                superClient.startAttempt(function (startData) {
                    console.log("nextAttempt() startAttempt processed by server");
                    document.location.reload();
                });
            }
        };
    }

    var dndActivity = new DragDrop();
    return dndActivity;
});
