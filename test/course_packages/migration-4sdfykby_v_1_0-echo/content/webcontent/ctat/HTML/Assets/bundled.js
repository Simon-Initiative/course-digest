(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

var Claim = (function(){
	
	var GuppyBox = require("./GuppyBox.js");
	
	var finalQtySerial = 0;
	
	function claimBase(claimId, guppyIds, onlyOne) {
		this.domNode = Util.createElement('div#'+claimId+".claim_container.expression");
		this.id = claimId;
		this.editBtn = Util.createElement('div#'+claimId+"_edit_btn.claim_edit_btn");
		this.editBtn.innerHTML = "edit";
		this.submitBtn = Util.createElement('div#'+claimId+"_submit_btn.CTATButton");
		this.submitBtn.innerHTML = "submit";
		this.deleteBtn = Util.createElement("div#"+claimId+"_close_btn.expression_btn.close_btn.CTATButton","&#215");
		this.deleteBtn.setAttribute("data-ctat-show-feedback", "false");
		this.deleteBtn.title = "delete claim";
		this.domNode.appendChild(this.editBtn);
		this.domNode.appendChild(this.submitBtn);
		this.domNode.appendChild(this.deleteBtn);
		this.valDisplayNodes = {};
		this.guppies = {length: 0};
		var locked = false;
		this.onlyOne = onlyOne;
		
		guppyIds.forEach((id, idx)=>{
			var guppyDiv = Util.createElement("div#"+this.domNode.id+id+".claim_guppy");
			this.guppies[idx] = this.guppies[guppyDiv.id] = {
				guppyBox: new GuppyBox(guppyDiv, false, true),
				dispNode: null
			};
			this.guppies.length++;
		});
		
		this.render = function() {
			for (let i = 0; i < this.guppies.length; i++) {
				this.guppies[i].guppyBox.render();	
			}
		};
		
		this.clear = function() {
			for (let i = 0; i < this.guppies.length; i++) {
				this.guppies[i].guppyBox.clear();	
			}
			this.editAll();
			CTATShellTools.findComponent(this.submitBtn.id)[0].setNotGraded();
		}
		
		this.valueEntered = function(inputId, valStr) {
			var guppy = this.guppies[inputId].guppyBox,
				dispNode = this.guppies[inputId].dispNode,
				guppyDiv = guppy.getDomNode(),
				nextSib = guppyDiv.nextSibling,
				processed = Util.Guppy.processString(valStr);
			
			if (!dispNode) {
				dispNode = Util.createElement('div#'+inputId+"_display_node.claim_value_display_node");
				dispNode.addEventListener('dblclick', this.editValue.bind(this, dispNode, guppy, true));
				dispNode.style.minWidth = $(guppyDiv).width()+'px';
				this.guppies[inputId].dispNode = dispNode;
			}
			
			if (guppyDiv.parentNode) {
				this.domNode.removeChild(guppyDiv);
				this.domNode.insertBefore(dispNode, nextSib);
			}
			Guppy.Doc.render(processed.xml, dispNode.id);
		}
		
		this.editAll = function() {
			console.log(this.id+" edit all, this.guppies is",this.guppies);
			for (let i = 0; i < this.guppies.length; i++) {
				let guppyBox = this.guppies[i].guppyBox;
				let dispNode = this.guppies[i].dispNode;
				
				console.log("edit #" + i,"guppyBox: ",guppyBox,"dispNode: ",dispNode);
				if (dispNode && dispNode.parentNode) {
					this.editValue(dispNode, guppyBox, false);
				} else {
					console.log("skipped, already editable");
				}
			}
		}
		
		this.editValue = function(dispNode, guppy, focus) {
			if (locked) {
				return;
			}
			var nextSib = dispNode.nextSibling;
			this.domNode.removeChild(dispNode);
			this.domNode.insertBefore(guppy.getDomNode(), nextSib);
			focus && guppy.focus();
		}
		
		this.hasUnsubmittedValues = function() {
			let gups = this.guppies,
				nGups = this.guppies.length;
			for (let i = 0; i < nGups; i++) {
				let gup = gups[i].guppyBox;
				if (gup.getDomNode().parentNode) {
					return true;
				}
			}
			return false;
		}
		
		this.submitValues = function() {
			let gups = this.guppies,
				nGups = this.guppies.length;
			for (let i = 0; i < nGups; i++) {
				let gup = gups[i].guppyBox;
				if (gup.getDomNode().parentNode) {
					gup.triggerDone();
				}
			}
		}
		
		this.lock = function() {
			locked = true;
			CTATShellTools.findComponent(this.submitBtn.id)[0].lock();
		};
		
		this.editBtn.addEventListener("click", this.editAll.bind(this));
	
	}
	
	var claimConstructors = {
		'limitingReagent': function(id, reagentList, studentValList) {
			claimBase.call(this, id, ["_value_input_1", "_value_input_2"], true);
			this.type = "limitingReagent";
			var reagentOptions = ['---'].concat(reagentList.map((ro)=>ro.substance));
			var substanceMenu = Util.createComboBox(
				this.domNode.id+"_substance_menu",
				["claim_dropdown"],
				reagentOptions,
				true,
				false,
				false
			);
			
			var comparisonMenu = Util.createComboBox(
				this.domNode.id+"_comparison_menu",
				["claim_dropdown"],
				['---', '<', '>', '='],
				true,
				false,
				false
			);
			
			var tNode1 = document.createTextNode("The limiting reagent is ");
			var tNode2 = document.createTextNode(" because ");
			this.domNode.insertBefore(this.guppies[1].guppyBox.getDomNode(), this.editBtn);
			this.domNode.insertBefore(comparisonMenu, this.guppies[1].guppyBox.getDomNode());
			this.domNode.insertBefore(this.guppies[0].guppyBox.getDomNode(), comparisonMenu);
			this.domNode.insertBefore(tNode2, this.guppies[0].guppyBox.getDomNode());
			this.domNode.insertBefore(substanceMenu, tNode2);
			this.domNode.insertBefore(tNode1, substanceMenu);
			
			var baseLock = this.lock;
			this.lock = function() {
				baseLock.call(this);
				CTATShellTools.findComponent(comparisonMenu.id)[0].lock();
				CTATShellTools.findComponent(substanceMenu.id)[0].lock();
			};
			
			var baseClear = this.clear;
			this.clear = function() {
				baseClear.call(this);
				substanceMenu.querySelector("select").value = '---';
				comparisonMenu.querySelector("select").value = '---';
			}
		},
		
		// the final quantity of [substances] is [textinput] [units | single unit]
		'finalQuantity': function(id, finalQtyList, studentValList) {
			this.units = [];
			var	substances = finalQtyList.map((qty) => {
					if (this.units.indexOf(qty.unit) < 0) {
						this.units.push(qty.unit);
					}
					return qty.substance;
				});
				
			claimBase.call(this, id, ["_value_input"]);
			this.type = 'finalQuantity';
			var substanceMenu = Util.createComboBox(
				this.domNode.id+"_substance_menu",
				["claim_dropdown"],
				['---'].concat(substances),
				true,
				false,
				false
			);
			
			var unitField;
			if (this.units.length > 1) {
				unitField = Util.createComboBox(
					this.domNode.id+"_unit_menu",
					["claim_dropdown"],
					['---'].concat(this.units),
					true,
					false,
					false
				);
			} else {
				unitField = document.createTextNode(this.units[0]);
			}
			
			var textNode1 = document.createTextNode("The final quantity of ");
			var textNode2 = document.createTextNode(" is ");
			
			this.domNode.insertBefore(unitField, this.editBtn);
			this.domNode.insertBefore(this.guppies[0].guppyBox.getDomNode(), unitField);
			this.domNode.insertBefore(textNode2, this.guppies[0].guppyBox.getDomNode());
			this.domNode.insertBefore(substanceMenu, textNode2);
			this.domNode.insertBefore(textNode1, substanceMenu);
			
			var baseLock = this.lock;
			this.lock = function() {
				baseLock.call(this);
				CTATShellTools.findComponent(substanceMenu.id)[0].lock();
				if (unitField.id) {
					CTATShellTools.findComponent(unitField.id)[0].lock();
				}
			};
			
			var baseClear = this.clear;
			this.clear = function() {
				baseClear.call(this);
				if (this.units.length > 1) {
					unitField.querySelector("select").value = '---';
				}
				substanceMenu.querySelector("select").value = '---';
			};
		},
		
		'validateXAssumption': function(id) {
			claimBase.call(this, id, ["_value_input"], true);
			this.type = 'validateXAssumption';
			var validOptions = ['---', 'valid', 'invalid'];
			var validMenu = Util.createComboBox(
				this.domNode.id+"_validity_menu",
				["claim_dropdown"],
				validOptions,
				true,
				false,
				false
			);
			
			var comparisonMenu = Util.createComboBox(
				this.domNode.id+"_comparison_menu",
				["claim_dropdown"],
				['---', '<', '>', '='],
				true,
				false,
				false
			);
			
			var percentMenu = Util.createComboBox(
				this.domNode.id+"_percent_menu",
				["claim_dropdown"],
				['---', '5%', '0.05'],
				true,
				false,
				false
			);
			
			var tNode1 = document.createTextNode("The assumption is ");
			var tNode2 = document.createTextNode(" because ");
			this.domNode.insertBefore(percentMenu, this.editBtn);
			this.domNode.insertBefore(comparisonMenu, percentMenu);
			this.domNode.insertBefore(this.guppies[0].guppyBox.getDomNode(), comparisonMenu);
			this.domNode.insertBefore(tNode2, this.guppies[0].guppyBox.getDomNode());
			this.domNode.insertBefore(validMenu, tNode2);
			this.domNode.insertBefore(tNode1, validMenu);
		
			var baseLock = this.lock;
			this.lock = function() {
				baseLock.call(this);
				CTATShellTools.findComponent(validMenu.id)[0].lock();
				CTATShellTools.findComponent(comparisonMenu.id)[0].lock();
				CTATShellTools.findComponent(percentMenu.id)[0].lock();
			}
			
			var baseClear = this.clear;
			this.clear = function() {
				baseClear.call(this);
				percentMenu.querySelector("select").value = '---';
				comparisonMenu.querySelector("select").value = '---';
				validMenu.querySelector("select").value = '---';
			}
		},
		
		'phOfSolution': function(id) {
			claimBase.call(this, id, ["_value_input"], true);
			this.type = 'phOfSolution';
			var tNode1 = document.createTextNode("The pH is ");
			this.domNode.insertBefore(this.guppies[0].guppyBox.getDomNode(), this.editBtn);
			this.domNode.insertBefore(tNode1, this.guppies[0].guppyBox.getDomNode());
		},
		
		'qH2O': function(id) {
			claimBase.call(this, id, ["_value_input"]);
			this.type = 'qH2O';
			var tNode1 = document.createElement("span");
			tNode1.innerHTML = "The value of q<sub>H2O</sub> is ";
			var unitField = document.createTextNode('kJ');
			this.domNode.insertBefore(unitField, this.editBtn);
			this.domNode.insertBefore(this.guppies[0].guppyBox.getDomNode(), unitField);
			this.domNode.insertBefore(tNode1, this.guppies[0].guppyBox.getDomNode());
		},
		
		'deltaH': function(id) {
			claimBase.call(this, id, ["_value_input"]);
			this.type = 'deltaH';
			var tNode1 = document.createTextNode("&#x394;H of the solution is ");
			var unitField = document.createTextNode('kJ/mol');
			this.domNode.insertBefore(unitField, this.editBtn);
			this.domNode.insertBefore(this.guppies[0].guppyBox.getDomNode(), unitField);
			this.domNode.insertBefore(tNode1, this.guppies[0].guppyBox.getDomNode());
		},
		
		'custom': function(id, text, onlyOne) {
			claimBase.call(this, id, ["_value_input"], onlyOne);
			this.type = id;
			var textChunks = text.split("<blank>");
			var tNodes = textChunks.map((tc)=>{
				let s = document.createElement('span');
				s.innerHTML = tc;
				return s;
			});
			var lastNode = this.editBtn;
			var gupIdx = 0;
			for (let i = tNodes.length-1; i > -1; i--) {
				this.domNode.insertBefore(tNodes[i], lastNode);
				let gup = this.guppies[gupIdx++],
					gNode;
				if (gup) {
					gNode = gup.guppyBox.getDomNode();
					this.domNode.insertBefore(gNode, tNodes[i]);
					lastNode = gNode;
				}
			}
		}
	};
	
	return {
		create: function(claimType) {
			return new claimConstructors[claimType](...Array.prototype.slice.call(arguments, 1));
		}
	}
})();

module.exports = Claim;
},{"./GuppyBox.js":4}],2:[function(require,module,exports){

var Expression = (function(){
		
	var PopupMenu = require("./PopupMenu.js");
	var GuppyBox = require("./GuppyBox.js");
	var RootsDisplay = require("./RootsDisplay.js");
	
	/**
	*	@Constructor
	*	Represents an expression added to the workspace
	*/
	var _expressionNum = 0;
	function Expression (expString, optLabel, id, gup, wasSimped, ogStr) {
		
		console.log("new Expression from string: "+expString);
		var expId = id || "expression_"+_expressionNum;
		if (expId === ("expression_"+_expressionNum)) {
			_expressionNum++;
		}
		var pointer = this;
		var gupInput = gup,
			varValueInput = null;
		var calcSrcXml = null;
		var expXml = null;
		var editHandler = workspace.editFormula.bind(workspace, id);
		var variables = null;
		var quadraticCoefficients = null;
		var roots = null;
		var optionMenu = null;
		var controlRow = null;
		var unitInput = null;
		var unitDisplay = null;
		var substanceInput = null;
		var substanceDisplay = null;
		var contextDisplay = null;
		
		/**
		*	Set the string representation of the expression
		*/
		this.setString = function(newStr, wasSimplified, newOgStr) {
			var gupXml;
			var processed = Util.Guppy.processString(newStr);
			ogStr = newOgStr || ogStr;
			expString = processed.text;
			if (gupInput) {
				gupXml = gupInput.getXml();
			} else if (wasSimplified) {
				gupXml = Util.Guppy.processString(ogStr).xml
			}
			
			if (wasSimplified || !gupXml) {
				calcSrcXml = gupXml;
				expXml = processed.xml;
			} else {
				calcSrcXml = null;
				expXml = gupXml;
			}
			console.log("expression setString new string is "+expString);
			variables = Util.chemParser.chemGetVariables(expString);
			exprNode.removeEventListener("click", editHandler);
			if (calcSrcXml) {
				calcSrcNode.classList.add("show")
				arrowNode.classList.add("show")
			} else {
				calcSrcNode.classList.remove("show");
				arrowNode.classList.remove("show")
				exprNode.addEventListener("click", editHandler);
			}
		}
		
		/**
		*	get the label for the expression
		*/
		this.getLabel = function() {
			return optLabel;
		};
		
		/**
		*	set the label for the expression
		*/
		this.setLabel = function(newLabel) {
			optLabel = newLabel;
			if (labelNode) {
				labelNode.innerHTML = newLabel+' :';
			} else {
				createLabel(newLabel);
			}
		}
		
		this.setGupInput = function(gup) {
			gupInput = gup;
		};
		
		this.getGupInput = function() {
			return gupInput;
		};
		
		this.setRoots = function(rs) {
			roots = rs;
		};
		
		this.getRoots = function() {
			return roots;
		};
		
		this.toString = function() {
			return expString;
		};
		
		this.getOriginalString = function() {
			return ogStr;
		};
		
		this.toXml = function() {
			return expXml;
		};
		
		this.simplify = function() {
			console.log("exp.simplify");
			return new Expression(Util.chemParser.chemSimplify(pointer.toString(), false, true), optLabel, expId+"_simplified");
		};
		
		this.solveQuadratic = function() {
			if (!roots) {
				roots = Util.chemParser.chemSolveQuadratic(...quadraticCoefficients);
				var rootDisp = new RootsDisplay(roots, expId, optLabel);
				workspace.addExpressionAfter(rootDisp, pointer);
			}
			return roots;
		};
		
		this.replaceVar = function(varName, varValue, newExpId) {
			var newStr = Util.chemParser.chemStringify(Util.chemParser.chemSetVariable(pointer.toString(), varName, varValue), true);
			return new Expression(newStr, optLabel, newExpId);
		};
		
		this.hideVarReplaceControls = function() {
			controlRow.classList.remove("show");
		};
		
		this.setAspect = function(aspect, value) {
			let btns = Array.prototype.slice.call(optionMenu.container.querySelectorAll("#"+expId+"_"+aspect+"_option_row .CTATButton"));
			let oldBtn = btns.find((btn)=>btn.classList.contains("highlight"));
			oldBtn && oldBtn.classList.remove("highlight");
			let display = aspect === "unit" ? unitDisplay : (aspect === "substance" ? substanceDisplay : contextDisplay);
			if (value) {
				let newBtn = btns.find((btn)=>{
					return btn.id === expId+'_set_'+aspect+'_'+value
				});
				
				newBtn.classList.add("highlight");
				
				let symData = workspace.getSymbols()[value];
				display.innerHTML = (symData && symData.tableData.html) ? symData.tableData.html : value;
				display.classList.add("show");
			} else {
				display.innerHTML = '';
			}
		}
		
		this.render = function() {
			if (!optionMenu) {
				initOptionMenu();
			}
			console.log("render xml: ",expXml);
			Guppy.Doc.render(expXml, exprNode.id);
			if (varValueInput) {
				var varValueGuppy = new GuppyBox(varValueInput, true);
			}
			if (calcSrcNode) {
				Guppy.Doc.render(calcSrcXml, calcSrcNode.id);
			}
		};
		
		this.sendUnitSAI = function(inputStr) {
			var input = unitInput.querySelector("input"),
				ctatObj = $(unitInput).data("CTATComponent");
			input.value = inputStr;
			ctatObj.processAction();
		};
		
		this.sendSubstanceSAI = function(inputStr) {
			var input = substanceInput.querySelector("input"),
				ctatObj = $(substanceInput).data("CTATComponent");
			input.value = inputStr;
			ctatObj.processAction();
		};
		
		this.toggleMenu = function(forceState) {
			switch(forceState) {
				case "close": 
					optionMenu.hide();
				break;
				case "open": 
					optionMenu.show();
				break;
				default:
					optionMenu.toggle();
			}
			CTATShellTools.findComponent(deleteBtn.id)[0].setEnabled(!optionMenu.isOpen())
		};
		
		function initOptionMenu() {
			console.log("expression.initOptionMenu(), expString is ",expString);
			
			//option menu container
			let workspaceContainer = document.querySelector("#workspace_container");
			let optionMenuDiv = Util.createElement('div#'+expId+"_option_menu.expression_option_menu");
			
			//build option list
			let opts = workspace.expressionOptions;
			let optionMenuBtns = [];
			
			optionMenuBtns.push({
				name: "edit",
				title: "edit the value of this expression",
				handler: editHandler,
				isCTAT: false,
				closeOnClick: true
			});
			
			if (opts.indexOf("solve quadratic") > -1) {
				optionMenuBtns.push({
					name: "solve quadratic",
					title: "solve for a variable using the quadratic formula",
					handler: null,
					isCTAT: true,
					closeOnClick: true,
					ctatAttrs: {
						'data-ctat-show-feedback': "false",
						'data-ctat-disable-on-correct': "false"
					}
				});
				quadraticCoefficients = Util.chemParser.chemGetQuadraticCoefficients(expString, true)
			}
			if (opts.indexOf("simplify") > -1) {
				let simpArdy = Util.chemParser.chemSimplified(expString);
				optionMenuBtns.push({
					name: "simplify",
					handler: null,
					isCTAT: true,
					closeOnClick: true,
					ctatAttrs: {
						'data-ctat-show-feedback': "false"
					},
					enabled: !!simpArdy
				});
			}
			if (opts.indexOf("replace variable") > -1) {
				if (variables.length > 0) {
					console.log("var button");
					controlRow = document.createElement('div');
					controlRow.id = expId+"_var_replace_ctrl_row";
					controlRow.classList.add('can_hide');
					controlRow.classList.add("expression_var_replace_ctrl_row");
					controlRow.innerHTML = "replace ";
					domNode.appendChild(controlRow);
					var varSelect = Util.createComboBox(
						expId+"_var_replace_var_select",
						["expression_var_replace_var_select"],
						['--'].concat(variables),
						false
					)
					controlRow.appendChild(varSelect);
					controlRow.appendChild(document.createTextNode(" with "));
					varValueInput = document.createElement('div');
					varValueInput.id = expId+"_var_value_entry";
					varValueInput.classList.add('expression_var_replace_value_entry');
					controlRow.appendChild(varValueInput);
					let varReplaceCancel = document.createElement('div');
					varReplaceCancel.innerHTML = "&#215";
					varReplaceCancel.classList.add("close_btn");
					varReplaceCancel.title = "cancel";
					varReplaceCancel.addEventListener("click", ()=> {
						workspace.setCurrentVarReplace(null);
						controlRow.classList.remove("show");
					});
					controlRow.appendChild(varReplaceCancel);
				}
				optionMenuBtns.push({
					name: "replace variable",
					closeOnClick: true,
					handler: ()=>{
						if (!workspace.getCurrentVarReplace()) {
							workspace.setCurrentVarReplace(pointer);
							controlRow.classList.add("show");
						}
					},
					enabled: (variables.length > 0)
				});
			}
			
			if (opts.indexOf("set unit") > -1) {
				console.log("unit button");
				var units = workspace.getSymbols("unit");
				units = Object.keys(units).map((u)=>units[u].tableData);
				var unitRowHtml = units.map((u)=>"<div id='"+expId+'_set_unit_'+u.str+"' class='CTATButton popup_menu_option_row_btn ignore_mousedown' data-ctat-disable-on-correct='false' data-ctat-show-feedback='false'>"+u.html+"</div>").join('');
				optionMenuBtns.push({
					name: "set unit",
					customHTML: "<div class='popup_menu_option_row_wrapper'>"+
									"<div class='popup_menu_option_row_title'>set unit:</div>"+
									"<div id='"+expId+"_unit_option_row' class='popup_menu_option_row'>"+
										unitRowHtml+"</div>"+
								"</div>",
					handler: function(e) {
						e.preventDefault();
						e.stopPropagation();
					}
				});
				unitDisplay = Util.createElement('div#'+expId+"_unit_display.expression_unit_display.can_hide");
				contentWrap.appendChild(unitDisplay);
			}
			
			//set substance button
			if (opts.indexOf("set substance") > -1) {
				var subs = workspace.getSymbols("substance");
				subs = Object.keys(subs).map((subName)=>subs[subName].tableData);
				optionMenuBtns.push({
					name: "set substance",
					customHTML: "<div class='popup_menu_option_row_wrapper'>"+
									"<div class='popup_menu_option_row_title'>set substance:</div>"+
									"<div id='"+expId+"_substance_option_row' class='popup_menu_option_row'>"+
										subs.map((s)=>"<div id='"+expId+'_set_substance_'+s.str+"' class='CTATButton popup_menu_option_row_btn ignore_mousedown' data-ctat-disable-on-correct='false' data-ctat-show-feedback='false'>"+s.html+"</div>").join('')+
									"</div>"+
								"</div>",
					handler: function(e) {
						e.preventDefault();
						e.stopPropagation();
					}
				});

				substanceDisplay = Util.createElement('div#'+expId+"_substance_display.expression_substance_display.can_hide");
				contentWrap.appendChild(substanceDisplay);
			}
			
			if (opts.indexOf("set context") > -1) {
				var ctxtOpts = workspace.getProblemConfig("contexts") || ["initial", "changed", "final"],
					ia = workspace.getProblemConfig('initialAlias'),
					ma = workspace.getProblemConfig('majorityAlias');
				if (ma && ma !== "none" && (ctxtOpts.indexOf(ma) < 0)) {
					ctxtOpts.splice(0, 0, ma);
				}
				if (ia && ia !== "none" && (ctxtOpts.indexOf(ia) < 0)) {
					ctxtOpts.splice(0, 0, ia);
				}
				optionMenuBtns.push({
					name: "set context",
					customHTML: "<div class='popup_menu_option_row_wrapper'>"+
									"<div class='popup_menu_option_row_title'>set context:</div>"+
									"<div id='"+expId+"_context_option_row' class='popup_menu_option_row'>"+
										ctxtOpts.map((c)=>"<div id='"+expId+'_set_context_'+c+"' class='CTATButton popup_menu_option_row_btn ignore_mousedown' data-ctat-disable-on-correct='false' data-ctat-show-feedback='false'>"+c+"</div>").join('')+
									"</div>"+
								"</div>",
					handler: function(e) {
						e.preventDefault();
						e.stopPropagation();
					}
				
				});

				contextDisplay = Util.createElement('div#'+expId+"_context_display.expression_context_display.can_hide");
				contentWrap.appendChild(contextDisplay);
			}
			btnContainer.appendChild(optionMenuDiv);
			optionMenu = new PopupMenu(optionMenuDiv.id, optionMenuBtns);
		}
		
		//create dom nodes
			//outermost wrapper div
		var domNode = document.createElement('div');
		domNode.id = expId;
		domNode.classList.add("expression");
			//div for calculation source, if any
		var calcSrcNode = document.createElement('div');
		calcSrcNode.id = expId+"_source_content";
		calcSrcNode.classList.add("expression_content");
		calcSrcNode.classList.add("expression_source_calc");
		calcSrcNode.classList.add("CTATTextField");
		calcSrcNode.classList.add("no_select");
		calcSrcNode.classList.add("can_hide");
		domNode.appendChild(calcSrcNode);
		var arrowNode = document.createElement('div');
		arrowNode.classList.add("expression_content");
		arrowNode.classList.add("expression_source_calc");
		arrowNode.classList.add("can_hide");
		arrowNode.innerHTML = '&#x2192;';
		domNode.appendChild(arrowNode);
		calcSrcNode.addEventListener('click', editHandler);
		var contentWrap = document.createElement('div');
		contentWrap.classList.add("expression_content");
		contentWrap.classList.add("expression_res_calc");
		domNode.appendChild(contentWrap);
			//div for the actual expression content
		var exprNode = document.createElement('div');
		exprNode.id = expId+"_content";
		exprNode.classList.add("expression_content");
		exprNode.classList.add("CTATTextField");
		exprNode.classList.add("no_select");
		contentWrap.appendChild(exprNode);
		
		pointer.setString(expString, wasSimped);
				
		//holds the label for the expression, if any
		var labelNode = null;
		
		//btn container
		var btnContainer = document.createElement('div');
		btnContainer.id = expId+"_btn_container";
		btnContainer.classList.add("expression_btn_container");
		domNode.appendChild(btnContainer);
		
		//open menu btn
		var menuBtn = Util.createElement('div#'+expId+"_open_menu_btn.ignore_mousedown.expression_btn", "options");
		menuBtn.addEventListener("click", (e)=> {
			pointer.toggleMenu();
			e.stopPropagation();
		});
		btnContainer.appendChild(menuBtn);
		
		//delete btn
		var deleteBtn = Util.createElement("div#"+expId+"_close_btn.expression_btn.close_btn.CTATButton","&#215");
		deleteBtn.setAttribute("data-ctat-show-feedback", "false");
		deleteBtn.title = "delete expression";
		btnContainer.appendChild(deleteBtn);
		
		this.domNode = domNode;
		
		this.id = expId;
		
		function createLabel(labelText) {
			labelNode = document.createElement('div');
			labelNode.classList.add("expression_label");
			labelNode.innerHTML = labelText + ' :';
			domNode.insertBefore(labelNode, domNode.firstChild);
		}
		
		
		optLabel && createLabel(optLabel);
		
	}
	
	return {
		create: function(sot, ol, id, g, ws, ogStr) {
			var newExp = new Expression(sot, ol, id, g, ws, ogStr);
			if (newExp.domNode) {
				return newExp;
			} else {
				return null;
			}
		}
	};
})();

module.exports = Expression;
},{"./GuppyBox.js":4,"./PopupMenu.js":5,"./RootsDisplay.js":7}],3:[function(require,module,exports){

/**
*	Constructor
*	The component for inputting new formulas in the workspace
*/
function FormulaInput(id, labelPlaceholder) {
	var GuppyBox = require("./GuppyBox.js");
	
	var inputWrapper = Util.createElement("div#"+id+".formula_entry_wrapper"),
		gup;
	this.domNode = inputWrapper;
	
	//label field
	var input1 = Util.createElement('div#'+id+"_name_entry.formula_entry_name.CTATTextInput");
	input1.setAttribute("data-ctat-tutor", 'false');
	input1.setAttribute('value', labelPlaceholder);
	input1.addEventListener('focusout', () => {
		let ctatCompInput = input1.querySelector("input");
		if (ctatCompInput.value) {
			let ctatObj = $(input1).data("CTATComponent");
			ctatObj.processAction();
		}
		workspace.focusGuppy(gup)
	});
	
	//guppy field
	var input2 = Util.createElement('div#'+id+"_formula_entry.formula_entry_content");
	
	//colon b/w fields
	var eqSpan = Util.createElement("span.formula_entry_equals");
	eqSpan.innerHTML = ":";
	
	//cancel btn
	var cancelBtn = Util.createElement("div.close_btn");
	cancelBtn.innerHTML = "&#215";
	cancelBtn.addEventListener("click", (e) => {
		workspace.formulaDeleted(inputWrapper.id);
	});
	
	//confirm btn
	var confirmBtn = Util.createElement("div.confirm_btn");
	confirmBtn.innerHTML = "&#10004";
	confirmBtn.title = "evaluate";
	confirmBtn.addEventListener('click', () => {
		var g = gup.getGuppy();
		g.engine.done();
		g.render(true);
	});
	
	inputWrapper.appendChild(input1);
	inputWrapper.appendChild(eqSpan);
	inputWrapper.appendChild(input2);
	inputWrapper.appendChild(confirmBtn);
	inputWrapper.appendChild(cancelBtn);
	
	this.render = function() {
		gup = new GuppyBox(input2, true);
	}
	
	this.getGuppy = function() {
		return gup;
	}
}

module.exports = FormulaInput;
},{"./GuppyBox.js":4}],4:[function(require,module,exports){
/**
*	Given a div, initialize it as an instance of the guppy editor and create a corresponding textinput
*/
function GuppyBox(div, render, doneOnBlur) { 
	var pointer = this;
	var activeNode = div;
	var domNode = activeNode;
	var ctatId = div.id+"_ctat";
	var active = false;
	var hiddenTextInput = Util.createElement("div#"+ctatId+".CTATTextInput");
	hiddenTextInput.style.display = "none";
	document.body.appendChild(hiddenTextInput);
	
	div.classList.add("no_select");
	
	function preProcessOutput(output) {
		return output.replace(/\* #/g, ' #');
	}
	
	var gup;
	this.render = function() {
		var events = {
			"done": () => {
				var input = hiddenTextInput.querySelector("input");
				var ctatObj = $(hiddenTextInput).data("CTATComponent");
				var valueStr;
				try {
					valueStr = preProcessOutput(gup.text());
					active = false;
				} catch(e) {
					console.log(e);
					if (!(e instanceof TypeError)) {
						valueStr = '__invalid_exp__';
					} else {
						console.log('empty box submitted, ignoring...');
					}
				}
				if (valueStr) {
					input.value = valueStr;
					workspace.unsetActiveGuppy(pointer);
					ctatObj.processAction();
				}
			},
			"focus": (args) => {
				console.log("guppy focus event, focused is ",args.focused);
				if (args.focused) {
					//trigger done on old activeGuppy, if necessary
					let activeGuppy = workspace.getActiveGuppy();
					if (activeGuppy && activeGuppy.doneOnBlur && activeGuppy !== pointer) {
						workspace.triggerGuppyDone(activeGuppy);
						Guppy.active_guppy = gup;
					}
					//set self as new activeGuppy
					active = true;
					workspace.setActiveGuppy(pointer);
				} else if (workspace.__needToRefocus === pointer) {
					console.log("refocusing...");
					workspace.focusGuppy(pointer);
					workspace.__needToRefocus = null;
				}
			}
		};
	
		gup	= new Guppy(activeNode.id, {
			"events": events,
			"settings": {
				"autoreplace": "auto",
				"empty_content": ''
			}
		});
	
		activeNode.addEventListener("mousedown", (e)=>{
			console.log("guppy mousedown");
			
			e.stopPropagation(); //swallow event to keep window.onmousedown from unfocusing 
		});
	};
	
	this.getDomNode = function() {return domNode};
	
	this.getText = function() {
		return preProcessOutput(gup.text());
	};
	
	this.getXml = function() {
		return gup.xml();
	};
	
	this.focus = function() {
		gup.activate();
	};
	
	this.getDomNode = function() {
		return domNode;
	};
	
	this.getGuppy = function() {
		return gup;
	};
	
	this.insertSymbol = function(symName) {
		gup.engine.insert_symbol(symName);
		gup.render(true);
	};
	
	this.enterString = function(string) {
		gup.typeInString(string);
	};
	
	this.triggerDone = function() {
		gup && gup.engine.done();
	};
	
	render && this.render();
	workspace.registerGuppy(ctatId, pointer);

	this.doneOnBlur = doneOnBlur;
	
	this.clear = function() {
		gup.engine.sel_all();
		gup.engine.sel_delete();
		gup.engine.sel_clear();
	};
/*	
	div.addEventListener("click", () => {
	});
*/
}

module.exports = GuppyBox;
},{}],5:[function(require,module,exports){
/**
*	@constructor
*	A pop-up context menu
*	@param containerName id of the <div> that contains the menu
*	@param options list of ids of option <div>s in the menu
*	@param submenus list of objects storing data about submenus
*/
function PopupMenu(containerName, options, parentMenu) {
	
	console.log("create popup menu : "+containerName, options);
	
	var top, left;
	this.container = document.querySelector("#"+containerName);
	this.container.classList.add("popup_menu");
	this.container.classList.add("can_hide");
	this.options = {};
	this.parentMenu = parentMenu;
	
	this.getPos = function() {
		return {top: top, left: left};
	};
	
	this.isOpen = function() {
		return this.container.classList.contains("show");
	}.bind(this);
	
	/**
	*	Shows the menu
	*	@param event the click event that instigated the display
	*	@param optPos optional object storing position to display the menu at
	*/
	this.show = function() {
		this.container.classList.add("show");
		if (!workspace.isVisible(this.container)) {
			workspace.scrollToBottom();
		}
	}.bind(this);
	
	/**
	*	Show a submenu of this menu
	*	@param submenuName the name of the menu option that is the parent of the submenu
	*/
	this.showSubmenu = function(submenuName) {
		this.hideSubmenus();
		let opt = this.options[submenuName];
		opt.submenu.container.style.left = "-"+$(opt.container).outerWidth()+"px";
		opt.submenu.container.style.top = ($(opt.container).outerHeight()*opt.idx-parseInt($(opt.container).css('border-top-width'), 10))+"px";
		opt.submenu.show();
	}.bind(this);
	
	/**
	*	Hide a submenu of this menu
	*	@param submenuName the name of the submenu to hide
	*/
	this.hideSubmenu = function(submenuName) {
		this.options[submenuName].submenu.hide();
	}.bind(this);
	
	/**
	*	Hide all submenus of this menu
	*/
	this.hideSubmenus = function() {
		for (let optName in this.options) {
			this.options[optName].submenu && this.options[optName].submenu.hide();
		}
	}.bind(this);
	
	/**
	*	Hide the menu
	*/
	this.hide = function() {
		this.hideSubmenus();
		this.container.classList.remove("show");
	}.bind(this);
	
	this.toggle = function() {
		if (this.isOpen()) {
			this.hide();
		} else {
			this.show();
		}
	}.bind(this);
	
	options.forEach((opt, i) => {
		let optName = opt.name,
			optId = optName.replace(/\s/g,'_'),
			option = {
				idx: i,
				enabled: true,
				closeOnClick: opt.closeOnClick
			};
		
		//option div
		let optDiv = Util.createElement('div#'+this.container.id+"_option_"+optId+".ignore_mousedown.popup_menu_option");
		if (opt.customHTML) {
			optDiv.innerHTML = opt.customHTML;
		} else {
			optDiv.innerHTML = optName;
			optDiv.classList.add("popup_menu_btn");
		}
		optDiv.title = opt.title || '';
		//ctat
		if (opt.isCTAT) {
			optDiv.classList.add("CTATButton");
			if (opt.ctatAttrs) {
				for (let attr in opt.ctatAttrs) {
					optDiv.setAttribute(attr, opt.ctatAttrs[attr]);
				}
			}
		}
		//enabled
		if (opt.enabled === false) {
			optDiv.setAttribute('data-ctat-enabled', "false");
			optDiv.classList.add("disabled");
			option.enabled = false;
		}
		
		option.container = optDiv;
		this.container.appendChild(optDiv);
		//submenu
		if (opt.submenu) {
			let submenuDiv = document.createElement('div');
			submenuDiv.id = this.container.id+"_"+optId+"_submenu";
			submenuDiv.classList.add("popup_menu_submenu");
			this.container.appendChild(submenuDiv);
			option.submenu = new PopupMenu(submenuDiv.id, opt.submenu.options, this);
			option.container.addEventListener("mouseover", this.showSubmenu.bind(this, optName));
		/*
			option.container.addEventListener("mouseout", (e) => {
				if (!((e.relatedTarget === option.submenu.container)
					||(e.relatedTarget.parentNode === option.submenu.container))) {
					this.hideSubmenu(optName);
				}
			})
		*/
		}
		//handler
		option.handler = opt.handler
		option.container.addEventListener("click", (e)=>{
			option.enabled && opt.handler && opt.handler(e);
			if (option.closeOnClick) {
				this.hide();
				let p = this;
				while (p = p.parentMenu) {
					p.hide();
				}
			}
		});

		this.options[optName] = option;
	});
}

module.exports = PopupMenu;
},{}],6:[function(require,module,exports){
function QuantitySelector() {
	var div = null;
	var tabRow = null;
	var mainPane = null;
	var tabDivs = null;
	var scrim = null;
	var activeTab = null;
	
	function init() {
		div = Util.createElement("div.q_select.can_hide");
		tabRow = Util.createElement("div.q_select_tab_row");
		mainPane = Util.createElement("div.q_select_main_pane");
		div.appendChild(tabRow);
		div.appendChild(mainPane);
		document.body.appendChild(div);
	};
	
	function populate(tabs) {
		activeTab = null;
		tabRow.innerHTML = '';
		mainPane.innerHTML = '';
		tabDivs = {};
		tabs.forEach((tab,idx)=>{
			var tabLabel = Util.createElement("div.q_select_tab");
			tabLabel.innerHTML = tab.name;
			tabRow.appendChild(tabLabel);
			tabLabel.addEventListener("click",goToTab.bind(this, tab.name));
			if (idx !== 0) {
				tabLabel.style.borderLeftWidth = "0px";
			}
			var tabPane = Util.createElement("div.q_select_tab_pane");
			var propertyCol = Util.createElement("div.q_select_tab_pane_prop_col");
			var properties = {};
			tab.properties.forEach((p)=> {
				var pSelect = Util.createElement('select.q_select_prop_select');
				var opts = p.options.slice();
				opts.unshift("--"+p.name+"--");
				opts.forEach((o)=>{
					var oTag = Util.createElement('option');
					oTag.innerHTML = o;
					pSelect.appendChild(oTag);
				});
				pSelect.addEventListener("change", applyFilters);
				propertyCol.appendChild(pSelect);
				properties[p.name] = {
					select: pSelect,
					compFunc: p.compFunc
				};
			});
			var listPane = Util.createElement("div.q_select_list_pane");
			
			tabPane.appendChild(propertyCol);
			tabPane.appendChild(listPane);
			tabDivs[tab.name] = {
				mainPane: tabPane,
				listPane: listPane,
				label: tabLabel,
				properties: properties,
				quantities: tab.quantities
			};
		});
		var tabRowFiller = Util.createElement("div.q_select_tab_row_filler");
		tabRow.appendChild(tabRowFiller);
		goToTab(tabs[0].name);
	}
	
	function listThese(qtyList) {
		let listPane = tabDivs[activeTab].listPane;
		listPane.innerHTML = '';
		
		qtyList.forEach((q)=>{
			var qName = q.getName(),
				btnID = "qty_btn_"+q.id;
				qBtn = Util.createElement("div#"+btnID+".CTATButton.q_select_qty_btn");
			qBtn.innerHTML = qName;
			listPane.appendChild(qBtn);
		});
	}
	
	function applyFilters() {
		
		var tabData = tabDivs[activeTab],
			filters = tabData.properties,
			qtys = tabData.quantities.slice();
			
		for (let fName in filters) {
			let filter = filters[fName]
			let select = filter.select;
			if (select.selectedIndex > 0) {
				let v = select.value;
				qtys = qtys.filter((qty)=>filter.compFunc ? filter.compFunc(v, qty) : qty[fName] === v)
			}
		}
		
		listThese(qtys);
	}
	
	function goToTab(tabName) {
		if (activeTab) {
			tabDivs[activeTab].label.classList.remove("active");
			mainPane.removeChild(tabDivs[activeTab].mainPane);
		}
		tabDivs[tabName].label.classList.add("active");
		mainPane.appendChild(tabDivs[tabName].mainPane);
		activeTab = tabName;
		applyFilters();
	}
	
	this.show = function(tabs) {
		populate(tabs);
		div.classList.add("show");
	};
	
	this.hide = function() {
		div.classList.remove("show");
	};
	
	init();
}

module.exports = QuantitySelector;
},{}],7:[function(require,module,exports){
function RootsDisplay(roots, expId, expLabel) {
	this.domNode = document.createElement('div');
	this.domNode.id = this.id = expId+"_roots_display";
	this.domNode.classList.add("roots_display");
	
	this.setRoots = function(newRoots) {
		this.domNode.innerHTML = "roots of "+expLabel+": x = "+newRoots[0];
		if (newRoots[1] !== undefined) {
			this.domNode.innerHTML += ", "+newRoots[1];
		}
	};
	
	this.render = function() {
		this.setRoots(roots);
	};
}

module.exports = RootsDisplay;
},{}],8:[function(require,module,exports){

function Table(tableId, reactionStr, isEquilibrium, inactiveReagents, initialRows) {
	var GuppyBox = require("./GuppyBox.js");
	
	var pointer = this;
	var sides = reactionStr.split('_is_');
	var leftCols = sides[0].split('_plus_').map((sub)=>{
		return {text: sub, html: Util.addSubscriptsToChemFormula(sub), substance: sub.replace(/^\d/, '')};
	});
	var rightCols = sides[1].split('_plus_').map((sub)=>{
		return {text: sub, html: Util.addSubscriptsToChemFormula(sub), substance: sub.replace(/^\d/, '')};
	});
	var allCols = leftCols.concat(rightCols);
	var numRows = 0;
	var renderable = false;
	var domNode = document.createElement('div');
	var cellIdToGuppy = {};
	domNode.id = tableId;
	domNode.classList.add('reaction_table');
	this.domNode = domNode;
	this.id = tableId;
	
	//delete button row
	var delBtnRow = document.createElement('div');
	delBtnRow.classList.add('reaction_table_row');
	domNode.appendChild(delBtnRow);
	//delete button
	var delBtn = document.createElement('div');
	delBtn.innerHTML = "&#215";
	delBtn.classList.add("expression_btn");
	delBtn.classList.add("close_btn");
	delBtn.classList.add("CTATButton");
	delBtn.id = tableId+"_close_btn";
	delBtn.setAttribute("data-ctat-show-feedback", "false");
	delBtn.title = "delete table";
	delBtnRow.appendChild(delBtn);
		
	//header row
	var titleRow = document.createElement('div');
	titleRow.classList.add('reaction_table_row', 'reaction_table_header');
	domNode.appendChild(titleRow);
	//header cells
	let fillerCell = document.createElement('div');
	fillerCell.classList.add('reaction_table_header_filler');
	titleRow.appendChild(fillerCell);
	let headerCellContainer = document.createElement('div');
	headerCellContainer.classList.add("reaction_table_cell_container");
	titleRow.appendChild(headerCellContainer);
	[leftCols,rightCols].forEach((cols, idx) => {
		cols.forEach((col, idx2) => {
			let header = document.createElement('div');
			header.innerHTML = col.html;
			header.classList.add('reaction_table_cell');
			header.classList.add('reaction_table_header_cell');
			headerCellContainer.appendChild(header);
			if ((idx2 < (cols.length-1)) || idx === 0) {
				header.style.borderRightWidth = "0px";
				if (idx2 < (cols.length-1)) {
					let plusCell = document.createElement('div');
					plusCell.classList.add("reaction_table_operator");
					plusCell.innerHTML = '+';
					header.appendChild(plusCell);
				}
			}
			if (idx2 > 0 || idx === 1) {
				header.style.borderLeftWidth = "0px";
			}
			if (idx === 0 && idx2 === (leftCols.length-1)) {
				let arrowCell = document.createElement('div');
				arrowCell.innerHTML = isEquilibrium ? "&#x21cc" : "&#8594;";
				arrowCell.classList.add('reaction_table_operator');
				header.appendChild(arrowCell);
			}
		});
	});
	
	//control row
	var ctrlRow = document.createElement('div');
	ctrlRow.classList.add('reaction_table_row');
	ctrlRow.classList.add('reaction_table_ctrl');
	domNode.appendChild(ctrlRow);
	//controls
	var addRowBtn = document.createElement('div');
	addRowBtn.id = tableId + "_add_row_btn";
	addRowBtn.classList.add('CTATButton');
	addRowBtn.classList.add('reaction_table_add_row_btn');
	addRowBtn.setAttribute('data-ctat-show-feedback', 'false');
	addRowBtn.setAttribute('data-ctat-disable-on-correct', 'false');
	addRowBtn.innerHTML = "+ Row";
	ctrlRow.appendChild(addRowBtn);
	
	function registerCellSrc(cell, srcContainer) {
		cell.addEventListener("mouseover", (e) => {
			let hoverTimer = setTimeout(() => {
				srcContainer.classList.add("show");
				let bodyPos = document.body.getBoundingClientRect();
				let cellPos = cell.getBoundingClientRect();
				let cellTop = cellPos.top;
				let cellLeft = cellPos.left;
				srcContainer.style.left = (window.scrollX+cellLeft)+"px";
				srcContainer.style.top = (window.scrollY+cellTop-$(srcContainer).height()-2)+"px";
				srcContainer.style.width = $(cell).width()+"px";
			}, 500);
			cell.addEventListener("mouseout", (e) => {
				clearTimeout(hoverTimer);
				srcContainer.classList.remove("show");
			});
		});
	}
	
	var unitOptions = ["---"].concat(Object.keys(workspace.getSymbols("unit")));
	var contextOptions = ['---', 'changed', 'final', 'equilibrium'],
		ia = workspace.getProblemConfig('initialAlias');
		ma = workspace.getProblemConfig('majorityAlias');
	if (ma && ma !== "none" && (contextOptions.indexOf(ma) < 0)) {
		contextOptions.splice(1, 0, ma);
	}
	if (ia && ia !== "none" && (contextOptions.indexOf(ia) < 0)) {
		contextOptions.splice(1, 0, ia);
	}
	if (workspace.getProblemConfig("canAssumeX")) {
		contextOptions.push("assume small x");
	}
	/**
	*	Add a row to the table
	*/
	this.addRow = function(context, unit) {
		console.log("addRow, context "+context+", unit "+unit);
		var row = document.createElement('div');
		var rowId = tableId + '_row_' + (numRows++);
		row.id = rowId;
		row.classList.add('reaction_table_row');
		row.classList.add('reaction_table_input_row');
		var contextCtrl = Util.createComboBox(
			rowId+"_context_entry",
			['reaction_table_cell', 'reaction_table_context_entry'],
			contextOptions.slice().sort((a,b)=>{return (a === context) ? -1 : 0}),
			true, false, false
		);
		var unitCtrl = Util.createComboBox(
			rowId+"_unit_entry",
			['reaction_table_unit_entry','reaction_table_cell'],
			unitOptions.slice().sort((a,b)=>{return (a === unit) ? -1 : 0}),
			true, false, false
		);
		row.appendChild(contextCtrl);
		row.appendChild(unitCtrl);
		var cellContainer = document.createElement("div");
		cellContainer.classList.add("reaction_table_cell_container");
		row.appendChild(cellContainer);
		allCols.forEach((col, i) => {
			let cellWrapper = document.createElement('div');
			cellWrapper.id = rowId+"_cell_"+i;
			cellWrapper.classList.add("reaction_table_cell");
			cellWrapper.classList.add("reaction_table_value_entry");
			if (inactiveReagents.indexOf(col.substance) >= 0) {
				cellWrapper.classList.add("inactive");
			}
			cellContainer.appendChild(cellWrapper);
			workspace.registerTableCell(cellWrapper.id, pointer);
		});
		var orderBtnContainer = document.createElement('div');
		orderBtnContainer.classList.add('reorder_btn_container');
		
		var upBtn = document.createElement('div');
		upBtn.classList.add('reorder_btn_up');
		upBtn.innerHTML = '&#8963;';
		upBtn.addEventListener('click', pointer.moveRow.bind(pointer, row.id, "up"));
		upBtn.setAttribute('title', "move row up");
		
		var dwnBtn = document.createElement('div');
		dwnBtn.classList.add('reorder_btn_dwn');
		dwnBtn.innerHTML = '&#8964;';
		dwnBtn.addEventListener('click', pointer.moveRow.bind(pointer, row.id, "down"));
		dwnBtn.setAttribute('title', "move row down");
		
		orderBtnContainer.appendChild(upBtn);
		orderBtnContainer.appendChild(dwnBtn);
		row.appendChild(orderBtnContainer);
		domNode.insertBefore(row, ctrlRow);
		if (renderable) {
			pointer.renderRow(row);
		}
	}
	
	this.moveRow = function(rowId, direction) {
		var rowNode = domNode.querySelector('#'+rowId);
		var toInsert = direction === "up" ? rowNode : rowNode.nextSibling;
		var before = direction === "up" ? rowNode.previousSibling : rowNode;
		if (toInsert.className.includes('reaction_table_input_row') && before.className.includes('reaction_table_input_row')) {
			domNode.removeChild(toInsert);
			domNode.insertBefore(toInsert, before);
		}
	}
	
	this.renderCell = function(cellDiv) {
		let cellGuppy = new GuppyBox(cellDiv, true, true);
		cellIdToGuppy[cellDiv.id] = cellGuppy;
	}
	
	/**
	*	Init cells as guppy boxes
	*/
	this.renderRow = function(row) {
		var cells = row.querySelectorAll(".reaction_table_value_entry");
		for (let i = 0; i < cells.length; i++) {
			if (!cells[i].className.includes("inactive")) {
				pointer.renderCell(cells[i]);
			}
		}
		if (row.className.includes("reaction_table_input_row")) {
			var contextCtrl = row.querySelector(".reaction_table_context_entry").querySelector("select");
			var unitCtrl = row.querySelector(".reaction_table_unit_entry").querySelector("select");
			var context = contextCtrl && contextCtrl.value;
			var unit = unitCtrl && unitCtrl.value;
			console.log("got unit "+unit+" and context "+context);
			if ((!unit || unit === "---") && (!context || context === "---")) {
				console.log("bing");
				pointer.lockCells(row);
			}
		}
	};
	
	/**
	*	Call renderRow on all rows
	*/
	this.render = function() {
		var rows = domNode.querySelectorAll('.reaction_table_row');
		for (let i = 0; i < rows.length; i++) {
			pointer.renderRow(rows[i]);
		}
		renderable = true;
	};
	
	this.lockCells = function(row) {
		var cellCont = row.querySelector(".reaction_table_cell_container");
		var scrim = document.createElement("div");
		scrim.id = row.id+"_lock_scrim";
		scrim.classList.add("reaction_table_row_scrim");
		scrim.classList.add("CTATButton");
		scrim.setAttribute("data-ctat-show-feedback", "false");
		
		cellCont.appendChild(scrim);
	};
	
	this.unlockCells = function(row) {
		var cellCont = row.querySelector(".reaction_table_cell_container"),
			scrim = cellCont.querySelector(".reaction_table_row_scrim");
		
		if (scrim) {
			cellCont.removeChild(scrim);
		}
	};
	
	this.cellEntered = function(cellId, guppy, str) {
		let cellDiv = domNode.querySelector('#'+cellId),
			parent,
			nextSib,
			contentDivId = cellId+"_display";
		if (cellDiv) {
			contentDiv = Util.createElement("div#"+contentDivId+".reaction_table_cell.reaction_table_value_entered.no_select");
			parent = cellDiv.parentNode,
			nextSib = cellDiv.nextSibling,
			//replace input w/ display node
			parent.removeChild(cellDiv);
			parent.insertBefore(contentDiv, nextSib);
			contentDiv.addEventListener("dblclick", pointer.editCell.bind(pointer, contentDivId));
		} else {
			contentDiv = domNode.querySelector('#'+cellId+'_display');
		}
	
		//simplified guppy output
		let simpGuppy = Util.Guppy.processString(str);
		
		Guppy.Doc.render(simpGuppy.xml, contentDiv.id);
	};
	
	this.editCell = function(cellId) {
		console.log("edit cell");
		var curCell = domNode.querySelector("#"+cellId),
			gup = cellIdToGuppy[cellId.replace("_display", '')],
			nextSib = curCell.nextSibling,
			parent = curCell.parentNode;
		parent.removeChild(curCell);
		parent.insertBefore(gup.getDomNode(), nextSib);
		gup.focus();
	};
	
	for (let rowId in initialRows) {
		let iRow = initialRows[rowId];
		pointer.addRow(iRow.context, iRow.unit);
	}
}

module.exports = Table;
},{"./GuppyBox.js":4}],9:[function(require,module,exports){
function TreeMenu(menuId, menuName, config, optScrimId) {
	menuId.charAt(0) !== "#" && (menuId = "#"+menuId); 
	optScrimId && optScrimId.charAt(0) !== "#" && (optScrimId = "#"+optScrimId);
	var pointer = this;
	var	frames = {},
		frameStack = [],
		activeFrame = null,
		itemClickHandler = function(){},
		header = document.createElement("h3"),
		closeBtn,
		nav,
		back,
		scrim;
	
	//scrim node
	optScrimId && (scrim = document.querySelector(optScrimId));
	//menu container
	(this.container = document.createElement('div')).id = menuId;
	this.container.classList.add("tree_menu");
	this.container.classList.add("menu");
	this.container.classList.add("can_hide");
	
	scrim.appendChild(this.container);
	//header
	header.innerHTML = menuName;
	this.container.appendChild(header);
	//close button
	closeBtn = document.createElement("div");
	closeBtn.innerHTML = "&#215";
	closeBtn.classList.add("close_btn");
	closeBtn.addEventListener("click", (e) => {
		pointer.hide();
		e.stopPropagation();
	});
	this.container.appendChild(closeBtn);
	//breadcrumb nav bar
	nav = document.createElement("div");
	nav.classList.add("tree_menu_nav");
	this.container.appendChild(nav);
	back = document.createElement("div");
	back.classList.add("tree_menu_back_btn");
	back.innerHTML = "&#5176;";
	back.addEventListener("click", () => {
		ascend();
	});
	nav.appendChild(back);
	function createFrame(name, items) {
		var frame = document.createElement("ul");
		frame.id = "tree_menu_frame_"+name;
		frame.classList.add("tree_menu_frame");
		for (let itemKey in items) {
			let item = items[itemKey];
			!item.children && (item.children = {});
			var li = document.createElement("li");
			li.id = "tree_menu_item_"+item.id;
			li.classList.add("tree_menu_item");
			var liBtn = document.createElement("div");
			liBtn.id = item.type+"_"+itemKey;
			liBtn.classList.add("CTATButton");
			liBtn.setAttribute("value", itemKey);
			liBtn.setAttribute("data-ctat-tutor", "false");
			liBtn.setAttribute("data-ctat-show-feedback", "false");
			liBtn.innerHTML = item.text;
			li.appendChild(liBtn);
			frame.appendChild(li);
			if (Object.keys(item.children).length > 0) {
				createFrame(item.id, item.children);
			} else {
				if (config.tutor && config.tutor.indexOf(item.type) > -1) {
					liBtn.setAttribute("data-ctat-tutor", "true");
					liBtn.setAttribute("data-ctat-disable-on-correct", "false");
				}
				if (config.render && config.render.indexOf(item.type) > -1) {
					liBtn.innerHTML = '$$'+item.text+'$$';
				}
			}
			li.addEventListener("click", (e) => {
				if (Object.keys(item.children).length > 0) {
					descendToFrame(item);
				}
				itemClickHandler(item);
				e.stopPropagation();
			});
		};
		frames[name] = frame;
	}
	
	function gotoFrame(frameItem) {
		activeFrame && pointer.container.removeChild(activeFrame);
		pointer.container.appendChild(activeFrame = frames[frameItem.id]);
		Guppy.Doc.render_all("text", "$$");
	}
	
	function descendToFrame(frameItem) {
		frameStack.push(frameItem);
		if (frameItem.id !== "top") {
			var breadCrumbSpan = document.createElement("span")
			breadCrumbSpan.classList.add("tree_menu_breadcrumb");
			breadCrumbSpan.innerHTML = frameItem.text;
			breadCrumbSpan.title = frameItem.text;
			breadCrumbSpan.addEventListener("click", () => {
				ascendToFrame(frameItem);
			});
			nav.appendChild(breadCrumbSpan);
		}
		gotoFrame(frameItem);
	}
	
	function ascendToFrame(frameItem) {
		while (frameStack[frameStack.length-1] != frameItem) {
			ascend();
		}
	}
	
	function ascend() {
		if (frameStack.length > 1) {
			frameStack.pop();
			nav.removeChild(nav.lastChild);
			gotoFrame(frameStack[frameStack.length-1]);
		}
	}
	
	this.setClickHandler = function(handler) {
		itemClickHandler = handler;
	};
	
	this.show = function() {
		pointer.container.classList.add("show");
		scrim && scrim.classList.add("show");
	};
	
	this.hide = function() {
		pointer.container.classList.remove("show");
		scrim && scrim.classList.remove("show"); 
	};
	
	createFrame("top", config.items);
	descendToFrame({id: "top"});
}

module.exports = TreeMenu;
},{}],10:[function(require,module,exports){
var u = {};

u.scriptSrc = (function(){
	let scripts = document.getElementsByTagName('script');
	let thisScript = scripts[scripts.length-1];
	return function(){ return thisScript.src };
})();

u.getQueryParams = function(windo) {
	let search = windo.location.search.substring(1);
	try {
		return JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) { return key===""?value:decodeURIComponent(value) });
	} catch(e) {
		return {};
	}
}

u.queryParams = u.getQueryParams(window);

u.createElement = function(eStr, innerHTML) {
	var el,type,id,classes;
	var sides = eStr.split("#");
	if (sides.length > 1) {
		type = sides[0];
		sides = sides[1].split(".");
		id = sides[0];
		classes = sides.slice(1);
	} else {
		sides = sides[0].split(".");
		type = sides[0];
		classes = sides.slice(1);
	}
	el = document.createElement(type);
	id && (el.id = id);
	classes.forEach((c)=>{
		el.classList.add(c);
	});
	el.innerHTML = innerHTML || '';
	return el;
}

u.createComboBox = function(id, classes, options, tutored, feedback, lockOnCorrect) {
	var combo = this.createElement('div#'+id+".CTATComboBox" + (classes.length ? "."+classes.join(".") : ''));
	combo.setAttribute('data-ctat-tutor', ''+tutored);
	combo.setAttribute('data-ctat-show-feedback', ''+feedback);
	combo.setAttribute('data-ctat-disable-on-correct', ''+lockOnCorrect);
	options.forEach((opt) => {
		let option = this.createElement('option', opt);
		option.value = opt;
		combo.appendChild(option);
	});
	
	return combo;
}

u.isDescendantOf = function(d, p) {
	while (d.parentNode) {
		if (d.parentNode === p) {
			return true;
		}
		d = d.parentNode;
	}
	return false;
}

u.addSubscriptsToChemFormula = function(formulaStr) {
	let formulaRegex = /([A-Z][a-z]?)([0-9]+)/g;
	return formulaStr.replace(formulaRegex, (match, p1, p2) => {
		return p1+'<sub>'+p2+'</sub>';
	});
}

u.genRuleChain = function(qty, chainData) {
	var rule = qty.fromRule,
		facts = qty.fromFacts;
	chainData = chainData || {added:{}, chain: []};
	if (!chainData.added[qty.id]) {
	
		chainData.added[qty.id] = true;
		facts.forEach((fact)=> {
			if (!fact.matchedTo.length && !fact.matched) {
				this.genRuleChain(fact, chainData);
			}
		});
		chainData.chain.push([qty, rule, facts]);
	}
	
	return chainData.chain;
}

u.repeatedExp = (function(){
	var expMap = {};
	return {
		clearMap: function() {
			expMap = {};
		},
		addExp: function(exp) {
			expMap[exp] = true;
		},
		checkExp: function(exp) {
			return !!expMap[exp]
		}
	}
})();

u.getDistToQty = function(atQty, toQty, dist) {
	dist = dist || 0;
	if (atQty === toQty) {
		return dist;
	} else {
		dist++;
		let min = Infinity;
		for (let i = 0; i < atQty.toFacts.length; i++) {
			let thisDist = this.getDistToQty(atQty.toFacts[i], toQty, dist);
			if (thisDist < min) {
				min = thisDist;
			}
		}
		return min;
	}
}

u.getNextQtyForward = function (fromQty, destQty) {
	
	var	nextQtys = fromQty.toFacts.slice();
		nextQty = null,
		dist = Infinity;
		
	if (destQty) {
		for(let i = 0; i < nextQtys.length; i++) {
			let thisDist = this.getDistToQty(nextQtys[i], destQty, 1);
			if (thisDist < dist) {
				nextQty = nextQtys[i];
				dist = thisDist;
			}
		}
	} else {
		nextQty = nextQtys.find((q) => q.fromHypothesis.isTrue && !q.matchedTo.length);
		dist = 1;
	}
	console.log("getNextQtyForward finding next step from "+fromQty.id+" to "+destQty.id+"...");
	console.log("next step is "+(nextQty ? nextQty.id : "none!")+" path distance is "+dist);
	return {qty: nextQty, distance: dist};
}

u.getNextQtyBackward = function (targetQty, depth) {
	depth = depth || 0;
	var prevQtys = targetQty.fromFacts;
	var notMatched = null;
	var closest = {qty: null, distance: 10000};
	for (let j = 0; j < prevQtys.length; j++) {
		let isMatched = false;
		let qty = prevQtys[j];
		for (let i = 0; i < qty.matchedTo.length; i++) {
			let matched = qty.matchedTo[i];
			if ((!qty.unit || matched.unit) && (!qty.substance || matched.substance) && (!qty.context || matched.context)) {
				isMatched = true;
			}
		}
		if (!isMatched) {
			notMatched = qty;
			let next = getNextQtyBackward(qty, depth+1);
			next.distance++;
			if (next.distance < closest.distance) {
				closest = next;
			}
		};
	}
	if (!closest.qty) {
		//every qty before target matched, hint at target
		return {qty: targetQty, distance: 0};
	} else {
		return closest;
	}
}

module.exports = u;
},{}],11:[function(require,module,exports){
/**
*	@Constructor	
*	Represents the workspace section of the interface
*	@param divId the id of the div element that houses the workspace
*/
function Workspace(divId) {
	var Expression = require("./Expression.js");
	var QuantitySelector = require("./QuantitySelector.js");
	var FormulaInput = require("./FormulaInput.js");
	var RootsDisplay = require("./RootsDisplay.js");
	var Table = require("./Table.js");
	var Claim = require("./Claim.js");
	var TreeMenu = require("./TreeMenu.js");
	
	const EQUATIONS_MAP = {
		"q_is_mcdt": {
			html: "q = mC&Delta;T",
			keys: {
				"q": "heat",
				"m": "mass",
				"C": "specific heat capacity",
				"T": "temperature"
			}
		},
		"equilibrium_exp": {
			html: "K = <div class='frac'><span>[C]<sup>c</sup>[D]<sup>d</sup></span><span class='symbol'>/</span><span class='bottom'>[A]<sup>a</sup>[B]<sup>b</sup></span></div> <br><br> where aA + bB &#x21cc cC + dD"
		},
		"ph_exp": {
			html: "pH = -log(H<sub>3</sub>O<sup>+</sup>)"
		},
		"poh_exp": {
			html: "pOH = -log(OH<sup>-</sup>)"
		}
	}
	
	var domNode,
		expressionContainer,
		popupMenu,
		replaceSubmenu,
		clickedVarData = null,
		currentVarReplace = null,
		activeExpression = null,
		expRegistry = {},
		guppyRegistry = {},
		tableCellRegistry = {},
		stashedClaims = {},
		symbols = {},
		editingFormula = '',
		buttonsLocked = false,
		pointer = this,
		symbolContainer = null,
		typeSymbolContainers = {},
		activeGuppy = null,
		symbolTarget = null,
		symbolBtnKeys = {},
		problemConfig = {},
		reactionMenu,
		claimMenu,
		problemGivens = null;
	
	if (divId && divId.charAt(0) !== "#") {
		divId = "#"+divId;
	}
	if (!(domNode = document.querySelector(divId))){
		console.error("workspace div not found");
	}
	
	expressionContainer = domNode.querySelector("#workspace_area");
	
	symbolContainer = document.querySelector("#symbol_container");
	
	this.setProblemConfig = function(conf) {
		problemConfig = conf;
	};
	
	this.getProblemConfig = function(attr) {
		return problemConfig[attr];
	};
	
	/** 
	*	return the dom node where this workspace instance lives
	**/
	this.getDomNode = function() {
		return domNode;
	};
	
	this.getSymbols = function(optType) {
		var ret = optType ? {} : symbols;
		if (optType) {
			for (let sym in symbols) {
				if (symbols[sym].tableData.type === optType) {
					ret[sym] = symbols[sym];
				}
			}
		}
		return ret;
	};
	
	this.getGuppy = function(id) {
		return guppyRegistry[id];
	};
	
	this.getActiveGuppy = function() {
		return activeGuppy;
	};
	
	this.setActiveGuppy = function(g) {
		var id = null, gup = g;
		if (g) {
			if (typeof g === "string") {
				id = g;
				gup = guppyRegistry[id];
				if (!gup) {
					console.warn("guppy w/ id "+id+" not found in registry");
				}
			} else {
				id = gup.getDomNode().id;
			}
			this.displaySymbolKeyboard(true);
		}
		console.log("setActiveGuppy: "+id);
		activeGuppy = gup;
	};
	
	//set active guppy = null IF g === active guppy
	this.unsetActiveGuppy = function(g) {
		if (g) {
			if (typeof g === "string") {
				g = guppyRegistry[g];
			}
			if (g === this.getActiveGuppy()) {
				console.log("unsetActiveGuppy");
				this.setActiveGuppy(null);
				this.displaySymbolKeyboard(false);
			}
		}
	};
	
	this.displaySymbolKeyboard = function(doDisplay) {
		let method = (doDisplay && !symbolContainer.className.includes('show')) ? 'add' : (!doDisplay && symbolContainer.className.includes('show')) ? 'remove' : null;
		method && symbolContainer.classList[method]('show');
	};
	
	this.focusGuppy = function(g) {
		g.focus();
	}
	
	//store problem givens to send back as SAI (so recorded for state save)
	this.setProblemGivens = function(pd) {
		problemGivens = pd;
	};
	
	this.getProblemGivens = function() {
		return problemGivens;
	};
	
	this.toPrecision = function(expr, numSigFigs) {
		expr = typeof expr !== "string" ? ''+expr : expr;
		return Util.chemParser.chemToPrecision(expr, numSigFigs, true);
	}
	
	this.formatChemStr = function (str, format) {
		format = format || 'html';
		var ret = symbols[str] ? symbols[str].tableData[format] : null;
		if (ret) {
			console.log("found in symbols map: "+ret);
			return ret;
		} else {
			var regexp = /(^\d)?([A-Z][a-z]?)(\d)?((?:\+|-)\d?)?/g;
			var formatted = '';
			var res;
			while (res = regexp.exec(str)) {
				let coeff = res[1],
					el = res[2],
					elCnt = res[3],
					charge = res[4],
					piece = '';
				
				if (coeff){
					formatted += coeff;
				}
				if (elCnt) {
					if (format === 'latex') piece = '{'+el+'}_{'+elCnt+'}';
					if (format === 'html') piece = el+'<sub>'+elCnt+'</sub>';
				} else {
					piece = el;
				}
				if (charge) {
					if (format === 'latex') piece = '{'+piece+'}^{'+charge+'}';
					if (format === 'html') piece = piece + '<sup>'+charge+'</sup>';
				}
				formatted += piece;
			}
			return formatted;
		}
	}
	
	this.registerGuppy = function(textInputId, gup) {
		guppyRegistry[textInputId] = gup;
	};
	
	this.registerTableCell = function(cellId, table) {
		tableCellRegistry[cellId] = table;
	};
	
	this.triggerGuppyDone = function(id) {
		var gup = typeof id === "string" ? guppyRegistry[id] : id;
		gup.triggerDone();
	};
	
	this.insertSymbol = function(symbolName, e) {
		console.log("insert symbol "+symbolName);
		var sym = symbols[symbolName];
		if (symbolTarget) {
			var symbolDiv = sym.div;
			if (symbolDiv.classList.contains("symbol_btn_active")) {
				if (symbolDiv.classList.contains("symbol_type_unit")) {
					symbolTarget.sendUnitSAI(symbolName);
				} else if (symbolDiv.classList.contains("symbol_type_substance")) {
					symbolTarget.sendSubstanceSAI(symbolName);
				}
				pointer.deactivateSymbolBtns();
			}
		} else if (activeGuppy) {
			activeGuppy.insertSymbol(sym.guppyData.key);
		} else {
			console.log("no active guppy");
		}
	};
	
	this.addSymbolCategory = function(category) {
		if (!typeSymbolContainers[category]) {
			var parentNode = document.createElement('div');
			parentNode.id = "symbol_container_type_"+category;
			parentNode.classList.add("symbol_type_container");
			var typeHeader = document.createElement('div');
			typeHeader.classList.add("symbol_type_header");
			typeHeader.innerHTML = (category === "notational") ?
				"Labels" :
				"Variables and Operators";
			parentNode.appendChild(typeHeader);
			symbolContainer.appendChild(parentNode);
			typeSymbolContainers[category] = parentNode;
		}
		return parentNode;
	};
	
	this.addSymbolToTable = function(tableData, guppyData) {
		var name = tableData.str,
			guppyKey = guppyData.key,
			symBtn = document.createElement("div"),
			parentNode,
			html = tableData.html || name;
		
		//add data to symbols map
		symbols[name] = {
			tableData: tableData,
			guppyData: guppyData,
			div: symBtn
		};
		
		//register w guppy
		if (!Guppy.is_global_symbol(guppyKey)) {
			console.log("adding global symbol "+guppyKey);
			Guppy.add_global_symbol(guppyKey, guppyData);
		}
		
		//html stuff
		let category = (tableData.type === "unit" || tableData.type === "substance") ? "notational" : "literal" ; 
		symBtn.classList.add("symbol_btn");
		symBtn.classList.add("symbol_type_"+tableData.type);
		symBtn.setAttribute('data-symbol-name', name);
		for (let styleName in tableData.styles) {
			symBtn.style[styleName] = tableData.styles[styleName];
		}
		let nameNode = document.createElement('span');
		nameNode.innerHTML = html;
		nameNode.querySelectorAll("sub").forEach((subNode)=>subNode.classList.add("symbol_btn_subscript"));
		nameNode.classList.add("symbol_btn_name");
		symBtn.appendChild(nameNode);
		if (!(parentNode = typeSymbolContainers[category])) {
			parentNode = this.addSymbolCategory(category);
		}
		parentNode.appendChild(symBtn);
		
		if (tableData.hotkey) {
			var keyHint = document.createElement('div'),
				keyHintStr = '',
				mk = tableData.modifierKey,
				hk = tableData.hotkey;
			if (hk) {
				if (mk) {
					keyHintStr = mk + "+" + (mk === "shift" ? hk.toUpperCase() : hk);
				} else {
					keyHintStr = hk;
				}
			}
			keyHint.classList.add("symbol_btn_key_hint");
			keyHint.innerHTML = '('+keyHintStr+')';
			symBtn.appendChild(keyHint);
			symbolBtnKeys[keyHintStr] = name;
			console.log("added key shortcut "+keyHintStr);
		}
	};
	
	this.registerSymbols = function(symbolList) {
		console.log("register symbols",symbolList);
		symbolList.sort((s1,s2)=>{
			if ((s1.type === "unit" || s1.type === "substance") && !(s2.type === "unit" || s2.type === "substance")) {
				return 1;
			} else if ((s2.type === "unit" || s2.type === "substance") && !(s1.type === "unit" || s1.type === "substance")) {
				return -1;
			} else {
				return 0;
			}
		});
		symbolList.forEach((sym) => {
			var name = sym.str,
				gupKey = sym.type !== "operator" ? name+' ' : name,
				gupType = sym.type === "variable" ? '&'+name+'&' : '',
				latexOutputStr = sym.latex || name;

			if (sym.type === "unit" || sym.type === "substance") {
				latexOutputStr = '{$1}'+latexOutputStr;
			}
			console.log("register symbol: "+sym.str+" latexOutputStr is "+latexOutputStr);
			var gupData = {
				"key": gupKey,
				"output": {
					"latex": latexOutputStr,
				},
				"attrs": {
					"type": gupType,
					"sym_name": gupKey
				},
				"delete": "no_pass"
			}
			
			if (sym.type !== "variable") {
				gupData.input = 1;	
			
			}
			sym.html = sym.html || sym.str;
			this.addSymbolToTable(sym, gupData);
		});
		
	};
	
	this.initSymbolListener = function() {
		window.addEventListener("keydown", (e) => {
			if (e.ctrlKey) e.preventDefault();
			let keyStr = e["ctrlKey"] ? "ctrl+" :
						 e["shiftKey"] ? "shift+" :
						 e["altKey"] ? "alt+" : '';
			keyStr += e.key;
			let symName = symbolBtnKeys[keyStr];
			if (symName) {
				this.insertSymbol(symName);
			}
		});
	};
	
	this.activateSymbolBtns = function(target, optTypes) {
		symbolTarget = target;
		typeQuery = ".symbol_btn"+optTypes.reduce((acc, str)=>{return acc+'.symbol_type_'+str}, '');
		var btns = symbolContainer.querySelectorAll(typeQuery);
		Array.prototype.forEach.call(btns, (btn) => btn.classList.add("symbol_btn_active"));
	};
	
	this.deactivateSymbolBtns = function() {
		symbolTarget = null;
		var btns = symbolContainer.querySelectorAll(".symbol_btn");
		Array.prototype.forEach.call(btns, (btn) => btn.classList.remove("symbol_btn_active"));
	};
	
	this.scrollToBottom = function() {
		expressionContainer.scrollTop = expressionContainer.scrollHeight;
	};
	
	this.isVisible = function(element) {
		var rect = expressionContainer.getBoundingClientRect();
		var eRect = element.getBoundingClientRect();
		
		return eRect.bottom <= rect.bottom; 
	};
	
	/**
	*	Add an expression to the workspace
	*	@param expressionDiv the <div> node containing the expression
	*/
	this.addExpression = function(expression) {
		console.log("workspace.addExpression()");
		expRegistry[expression.id] = expression;
		expressionContainer.insertBefore(expression.domNode, bottomSection);
		activeExpression = expression;
		expression.render();
		pointer.scrollToBottom();
		console.log("workspace.addExpression() over");
	}.bind(this);
	
	this.addExpressionAfter = function(toAdd, sibling) {
		expRegistry[toAdd.id] = toAdd;
		var nextSib = sibling.domNode.nextSibling;
		if (!nextSib || (nextSib.parentNode === expressionContainer)) {
			expressionContainer.insertBefore(toAdd.domNode, nextSib);
			toAdd.render();
			expressionContainer.scrollTop = expressionContainer.scrollHeight;
		}
	}
	
	/**
	*	Simplify the given expression and add the result as a new expression
	*/
	this.simplifyExpression = function(expression) {
		expression && pointer.addExpression(expression.simplify());
	}
	
	this.getEditingFormula = function() {
		return editingFormula;
	};
	
	this.setEditingFormula = function(id) {
		editingFormula = id;
		pointer.setButtonsLocked(!!id);
	};
	
	this.getCurrentVarReplace = function() {
		return currentVarReplace;
	};
	
	this.setCurrentVarReplace = function(exp) {
		currentVarReplace = exp;
		pointer.setButtonsLocked(!!exp);
	};
	
	
	this.enterVar = function() {
		var valueInput = document.createElement("div"),
			position = popupMenu.getPos(),
			spanPos = clickedVarData.span.getBoundingClientRect();
		valueInput.id = "var_entry_field_for_"+clickedVarData.expression.id;
		valueInput.classList.add("CTATTextInput");
		valueInput.classList.add("var_entry_field");
		valueInput.style.top = (spanPos.top-4+window.scrollY)+'px';
		valueInput.style.left = spanPos.left+'px';
		valueInput.setAttribute("autofocus","true");
		document.body.appendChild(valueInput);
	};
	
	var __formulaNum = 1;
	this.formulaEntered = function(ctatInputId, expressionStr, expressionId, expressionLabel, wasSimped, ogStr) {
		console.log("formulaEntered, inputID: "+ctatInputId);
		var gup = guppyRegistry[ctatInputId],
			gupWrapper = null, 
			expr = null;
		
		if (expr = Expression.create(expressionStr, expressionLabel, expressionId, gup, wasSimped, ogStr)) {
			if (expressionLabel === 'eq'+__formulaNum) {
				__formulaNum++;
			}
			if (gup) {
				expressionContainer.removeChild(gup.getDomNode().parentNode);
			}
			pointer.addExpression(expr);
		}
		pointer.setButtonsLocked(false);
	};
	
	this.formulaAdded = function(expId, expString, optLabel) {
		//create expression obj
		var expr = Expression.create(expString, optLabel, expId);
		//add to DOM
		pointer.addExpression(expr);
	};
	
	this.formulaDeleted = function(expId) {
		console.log("formulaDeleted "+expId);
		console.log(editingFormula);
		var exprNode = expressionContainer.querySelector("#"+expId);
		var inputFor = exprNode.getAttribute("data-input-for");
		if (currentVarReplace && currentVarReplace.id === expId) {
			this.setCurrentVarReplace(null);
		} else if (editingFormula && inputFor === editingFormula) {
			this.setEditingFormula('');
		} else if (exprNode.className.includes("formula_entry_wrapper")) {
			this.setButtonsLocked(false);
		}
		expressionContainer.removeChild(exprNode);
		//delete roots disp too if exists
		let rootsDisp = expressionContainer.querySelector("#"+expId+"_roots_display");
		rootsDisp && expressionContainer.removeChild(rootsDisp);
	};
	
	this.tableDeleted = function(tableId) {
		console.log("formulaDeleted "+tableId);
		var tableNode = expressionContainer.querySelector("#"+tableId);
		expressionContainer.removeChild(tableNode);
	}
	
	this.claimDeleted = function(claimId) {
		var claim = expRegistry[claimId];
		if (claim.onlyOne) {
			claim.clear();
			stashedClaims[claim.id] = claim;
		}
		var cNode = expressionContainer.querySelector("#"+claimId);
		console.log("workspace.claimDeleted, id: ",claimId," node: ",cNode);
		expressionContainer.removeChild(cNode);
	}
	
	this.editFormula = function(id) {
		if (this.getButtonsLocked()) {
			return;
		}
		var expr = expRegistry[id];
		var gup = expr.getGupInput();
		var newInputComp;
		var nextSib = expr.domNode.nextSibling;
		expressionContainer.removeChild(expr.domNode);
		if (!gup) { //expression was result of manipulating prior expr
			newInputComp = new FormulaInput("formula_entry_wrapper_for_"+expr.id, expr.getLabel());
			inputWrapper = newInputComp.domNode;
		} else {
			inputWrapper = gup.getDomNode().parentNode;
		}
		expressionContainer.insertBefore(inputWrapper, nextSib);
		inputWrapper.setAttribute("data-input-for", id);
		if (newInputComp) {
			newInputComp.render();
			gup = newInputComp.getGuppy();
			expr.setGupInput(gup);
			gup.enterString(expr.getOriginalString() || expr.toString());
		}
		window.getSelection().removeAllRanges();
		gup.focus();
		pointer.setActiveGuppy(gup);
		pointer.setEditingFormula(id);
	};
	
	this.solveQuadratic = function(expId) {
		var expr = expRegistry[expId];
		return expr.solveQuadratic();
	};
	
	this.getExpRegistry = function() { return expRegistry };
	
	this.quadraticSolved = function(expId, roots) {
		console.log("quadraticSolved ",expId,roots);
		var expr = expRegistry[expId];
		expr.setRoots(roots);
		var rootDisp = expRegistry[expId+"_roots_display"];
		if (rootDisp) {
			console.log("got existing roots display");
			rootDisp.setRoots(roots);
		} else {
			console.log("creating new roots display");
			rootDisp = new RootsDisplay(roots, expId, expr.getLabel());
			pointer.addExpressionAfter(rootDisp, expr);
		}
	};
	
	this.doneEditingFormula = function(expID, newStr, newLabel, wasSimped, ogStr) {
		var expr = expRegistry[expID],
			gup,
			gupWrapper;
		if (expr) {
			gup = expr.getGupInput(),
			gupWrapper = gup ? gup.getDomNode().parentNode : null;
			//set expr.string
			expr.setString(newStr, wasSimped, ogStr);
			//set expr.label
			expr.setLabel(newLabel);
			//render expr
			if (gupWrapper && gupWrapper.parentNode) {
				var nextSib = gupWrapper.nextSibling;
				gupWrapper.parentNode.removeChild(gupWrapper);
				expressionContainer.insertBefore(expr.domNode, nextSib);
			}
			expr.render();
		} else {
			console.warn("workspace.doneEditingFormula couldn't find expression: ",expID);
		}
		pointer.setEditingFormula('');
	};
	
	this.claimValueEntered = function(claimId, valId, val) {
		console.log("claimValueEntered: "+claimId);
		console.log(expRegistry);
		var claim = expRegistry[claimId];
		claim.valueEntered(valId, val);
	}
	
	this.tableAdded = function(table) {
		var table = new Table(table.id, table.reaction, table.isEquilibrium, table.inactiveReagents, table.rows);
		pointer.addExpression(table);
	}
	
	this.tableRowAdded = function(tableId, context, unit) {
		var table = expRegistry[tableId];
		table.addRow(context, unit);
	};
	
	this.tableCellEntered = function(ctatInputId, cellVal) {
		var gup = guppyRegistry[ctatInputId],
			cellId = ctatInputId.replace('_ctat', ''),
			table = tableCellRegistry[cellId];
		
		console.log("tableCellEntered(), ctatInputId = "+ctatInputId+", cellId = "+cellId);
		
		table.cellEntered(cellId, gup, cellVal);
	}
	
	this.unlockTableRowCells = function(tableId, rowId) {
		var table = expRegistry[tableId];
		var row = table.domNode.querySelector('#'+rowId);
		table.unlockCells(row);
	}
	
	this.variableEntered = function(newExpString, newExpId, newExpLabel) {
		console.log("workspace.variableEntered()");
		var newExp = Expression.create(newExpString, newExpLabel, newExpId)
		console.log("got newExp:",newExp);
		currentVarReplace && currentVarReplace.hideVarReplaceControls();
		pointer.addExpression(newExp);
		pointer.setButtonsLocked(false);
		currentVarReplace = null;
	}
	
	this.claimAdded = function(type, id) {
		var claim = stashedClaims[id] ? stashedClaims[id] : Claim.create.apply(this, arguments);
		pointer.addExpression(claim);
		return claim;
	}
	
	this.claimHasUnsubmittedValues = function(claimId) {
		var claim = expRegistry[claimId];
		return claim.hasUnsubmittedValues();
	}
	
	this.enterClaimFields = function(claimId) {
		var claim = expRegistry[claimId];
		
		claim.submitValues();
	}
	
	this.lockClaim = function(claimId) {
		var claim = expRegistry[claimId];
		claim.lock();
	}
	
	this.studentValuesChanged = function(changeType) {
		var dropdownDivWraps = Array.prototype.slice.call(expressionContainer.querySelectorAll('.value_dropdown')),
			dropdownNodes = dropdownDivWraps.map((divWrap) => divWrap.querySelector('select')),
			valueArgs = arguments;
		
		console.log("studentValuesChanged(", arguments[0], arguments[1], ")");
		
		dropdownNodes.forEach((dropdownNode) => {
			let newVal, oldVal, newOption, insertBefore, toRemove;
			switch(changeType) {
				case "change":
					oldVal = valueArgs[2];
				case "add":
					newVal = valueArgs[1];
					newOption = document.createElement('option');
					newOption.innerHTML = newVal;
					break;
				case "remove":
					oldVal = valueArgs[1];
			}
			let options = dropdownNode.querySelectorAll('option');
			for(let i = 0; i < options.length; i++) {
				if (oldVal && options[i].innerHTML === oldVal) {
					toRemove = options[i];
					continue;
				}
				if (!insertBefore && (newVal - options[i].innerHTML < 0)) {
					insertBefore = options[i];
				}
			} 
			newOption && dropdownNode.insertBefore(newOption, insertBefore);
			toRemove && toRemove.parentNode.removeChild(toRemove);
		});
	}
	
	var __formulaEntrySerial = 0;
	this.enterFormula = function() {
		var fInput = new FormulaInput("formula_entry_wrapper_"+(__formulaEntrySerial++), 'eq'+(__formulaNum));
		
		pointer.addExpression(fInput);
		pointer.setButtonsLocked(true);
	};
	
	this.fillEquationSheet = function(eqs) {
		console.log("fillEquationSheet");
		let eqContainer = document.getElementById("equation_sheet_equations");
		let keyContainer = document.getElementById("equation_sheet_keys");
		eqs.forEach((eq)=>{
			console.log("\t add equation ",eq);
			let eqData = EQUATIONS_MAP[eq];
			let equation = Util.createElement("div#equation_sheet_equation_"+eq+".equation_sheet_equation", '<i>'+eqData.html+'</i>');
			eqContainer.appendChild(equation);
			if (eqData.keys) {
				let row = Util.createElement("div.flex_row.equation_sheet_key_row");
				for(let varName in eqData.keys) {
					let keyCell = Util.createElement("div.equation_sheet_key_entry", "<i>"+varName+'</i> = '+eqData.key[varName]);
					row.appendChild(keyCell);
				}
				keyContainer.appendChild(row);
			}
		});
	}
	
	this.showEquationSheet = function() {
		let scrim = document.getElementById("workspace_scrim");
		let sheet = document.getElementById("equation_sheet");
		scrim.classList.add("show");
		sheet.classList.add("show");
		
	};
	
	this.hideEquationSheet = function() {
		let scrim = document.getElementById("workspace_scrim");
		let sheet = document.getElementById("equation_sheet");
		sheet.classList.remove("show");
		scrim.classList.remove("show");
		
	};
	
	this.aspectEntered = function(expressionId, aspect, value) {
		let exp = expRegistry[expressionId];
		exp.setAspect(aspect, value);
	}
/*		
	this.unitEntered = function(expressionId, unitStr) {
		let exp = expRegistry[expressionId];
		exp.setUnit(unitStr);
	};
	
	this.substanceEntered = function(expressionId, subStr) {
		let exp = expRegistry[expressionId];
		exp.setSubstance(subStr);
	};
	
	this.contextEntered = function(expressionId, ctxtStr) {
		let exp = expRegistry[expressionId];
		exp.setContext(ctxtStr);
	};
*/		
	this.getCurLabel = function() {
		let labelField = expressionContainer.querySelector(".formula_entry_name input");
		return labelField.value || ('eq'+__formulaNum);
	};
	
	this.getLabelById = function(id) {
		let labelField = expressionContainer.querySelector("#"+id+' input');
		return labelField.value || ('eq'+__formulaNum);
	};
	
	this.closeAllOptionMenus = function() {
		for (let id in expRegistry) {
			let exp = expRegistry[id];
			if (exp.toggleMenu) {
				exp.toggleMenu("close");
			}
		}
	};
	
	var menuHandlers = {
		"enter": function() {
			pointer.enterVar();
		},
		"replace": function() {
			varToReplace = clickedVarData;
			varToReplace.span.classList.add("to-replace");
			dataBrowserMenu.show();
		},
		"calculate": function() {
			//TODO
		}
	}
	
	function menuClicked(option) {
		menuHandlers[option]();
		this.hidePopup();
	}
	
	/**
	*	Hide the "replace/calculate/enter" popup menu
	*/
	this.hidePopup = function() {
		popupMenu.hide();
		clickedVarData && clickedVarData.span.classList.remove('clicked');
		clickedVarData = null;
	}
	
	/**
	*	enable/disable the 'add formula', 'create formula' etc. buttons
	*/
	this.setButtonsLocked = function(locked) {
		buttonsLocked = locked;
		var func = locked ? "addClass" : "removeClass";
		$('.workspace_btn')[func]('locked');
	};
	
	this.getButtonsLocked = function() {
		return buttonsLocked;
	};
	
	var qtySelector = new QuantitySelector();
	this.showQtySelector = function(tabData) {
		
		qtySelector.show(tabData);
		
	}
	
	this.hideQtySelector = function() {
		qtySelector.hide();
	}
	
	var qtyIDMap = {};
	this.registerQtyID = function(newID) {
		while (qtyIDMap[newID]) {
			if (/_\d+$/.test(newID)) {
				newID = newID.replace(/_(\d+)$/, (res, g1)=>"_"+(parseInt(g1, 10)+1));
			} else {
				newID += "_1";
			}
		}
		qtyIDMap[newID] = true;
		return newID;
	}
	
	var bottomSection = document.querySelector("#workspace_bottom_section"),
		btnContainer = document.querySelector("#workspace_btn_row");
		
	this.initComponentBtns = function(problemData) {
		var makeClaimButton = Util.createElement("div#make_claim_btn.CTATButton.workspace_btn","Make Claim");
		makeClaimButton.setAttribute("data-ctat-tutor", "false");
		makeClaimButton.setAttribute("title", "Make a claim about a solution");
		makeClaimButton.addEventListener("click", () => {
			if (!makeClaimButton.className.includes('locked')) {
				claimMenu.show();
			}
		});
		btnContainer.appendChild(makeClaimButton);
		
		if (problemData.usesIceTable) {
			var createTableButton = Util.createElement("div#create_table_btn.workspace_btn.CTATButton","Create ICE Table");
			createTableButton.setAttribute("data-ctat-tutor", "false");
			createTableButton.setAttribute("title", "Add an ICE table to the workspace");
			createTableButton.addEventListener("click", () => {
				if (!createTableButton.className.includes('locked')) {
					reactionMenu.show();
				}
			});
			btnContainer.appendChild(createTableButton);
		}
		
		var createFormulaButton = Util.createElement("div#create_formula_btn.CTATButton.workspace_btn", "Create Formula");
		createFormulaButton.setAttribute("data-ctat-tutor", "false");
		createFormulaButton.setAttribute("title", "Add a formula to the workspace");
		createFormulaButton.addEventListener("click", () => {
			if (!createFormulaButton.className.includes('locked')) {
				workspace.enterFormula();
			}
		});
		btnContainer.appendChild(createFormulaButton);
	
		if (problemData.usesEqSheet) {
			var showEqSheetButton = Util.createElement("div#show_eq_sheet_btn_.CTATButton.workspace_btn", "Show Equation Sheet");
			showEqSheetButton.setAttribute("data-ctat-tutor", "false");
			showEqSheetButton.setAttribute("title", "View equation sheet");
			showEqSheetButton.addEventListener("click", () => {
				if (!showEqSheetButton.className.includes('locked')) {
					workspace.showEquationSheet();
				}
			});
			btnContainer.appendChild(showEqSheetButton);
		}
	}
	
	this.initMenus = function(problemData) {
		let claimMenuTypes = problemData.claimTypes,
			reactionList = problemData.reactions;
		
		console.log("create reaction browser");
		reactionMenu = new TreeMenu("reaction_popup", "Chemical Reactions", {"tutor": ['reaction_menu_item'], "items": reactionList}, "workspace_scrim");
		reactionMenu.setClickHandler((itemClicked) => {
			if (itemClicked.type === "reaction_menu_item") {
				reactionMenu.hide();
			}
		});
		
		var claimMenuConfig = {
			'tutor': ['claim_menu_item'],
			'items': {}
		};
		
		claimMenuTypes.forEach((cmt) => {
			let id,txt;
			if (typeof cmt === "string") {
				id = cmt.toLowerCase().split(' ').join('_');
				txt = cmt;
			} else {
				id = 'custom_claim_'+cmt.id;
				txt = cmt.btnText;
			}
			claimMenuConfig.items[id] = {
				'id': id,
				'text': txt,
				'type': 'claim_menu_item'
			}
		});
		
		claimMenu = new TreeMenu("claim_popup", "Claim Types", claimMenuConfig, "workspace_scrim");
		claimMenu.setClickHandler((itemClicked) => {
			claimMenu.hide();
		});
	}
};

module.exports = Workspace;
},{"./Claim.js":1,"./Expression.js":2,"./FormulaInput.js":3,"./QuantitySelector.js":6,"./RootsDisplay.js":7,"./Table.js":8,"./TreeMenu.js":9}],12:[function(require,module,exports){
var Workspace = require("./Workspace.js");
window.Util = require("./Util.js");

window.__setProblemGivens = function(givens) {
	window.__problemGivens = givens;
}

window.addEventListener("noolsModelLoaded", (e) => {
	// resend givens as SAIs if not restoring state from previous attempt
	let state = getProblemStateStatus();
	let replayMode = false;
	if (window.parent !== window) {
		replayMode = Util.getQueryParams(window.parent)["replay_mode"];
	}
	console.log("noolsModelLoaded event, problemStateStatus is ");
	console.log("problemStateStatus.canRestore is "+state.canRestore());
	console.log("problemStateStatus.isSendingSavedMsgsForRestore is "+state.isSendingSavedMsgsForRestore());
	console.log("completion status is "+CTAT.ToolTutor.tutor.getProblemSummary().getCompletionStatus());
	console.log("mustRetrieveProblemState is "+CTAT.ToolTutor.tutor.getOutputStatus().mustRetrieveProblemState());
	console.log("replayMode is ",replayMode);
	
	CTATLMS.customGradeStudent = function(problem_summary) {
		let completed = false;
		let score = 0.0;
		try {
			let ps = (typeof(problem_summary)=="string" ? JSON.parse(problem_summary) : problem_summary);
			let nc = ps.correct;
			let nClaims = 0;
			let nTries = ps.correct+ps.errors+ps.hints;
			if(ps.score_labels) {
				for (let s in ps.score_labels) {
					if (s.includes("claim")) {
						nClaims += ps.score_labels[s];
					}
				}
			} 
			if (nClaims) {
				if (nClaims >= ps.required_steps) { //score 80 - 100
					score = 80 + 20 * (ps.correct/nTries);
					completed = true;
				} else {
					score = 20 + 60 * (nClaims/ps.required_steps); //score 20 - 80
				}
			} else {
				score = nTries > 20 ? 20 : nTries; //score 0 - 20
			}
			score /= 100;
		} catch(e) {
			console.log("CTATLMS.gradeStudent error processing problem summary", e, "\nproblem_summary", problem_summary);
			if (ps.required_steps <= 0) {
				score = 1.0;
				completed = true;
			} else {
				score = (ps.correct / ps.required_steps);
				completed = ps.correct_steps >= ps.required_steps;
			}
		}
		return {"score": score, "completed": completed};
	};
	
	if (!CTAT.ToolTutor.tutor.getOutputStatus().mustRetrieveProblemState() && replayMode !== "true") {
		console.log("sending givens SAI");
		
		let givenStr = JSON.stringify(window.__problemGivens);
		let sai = new CTATSAI('problem_givens', 'setGivens', givenStr);
		CTATCommShell.commShell.processComponentAction(sai,true,true,true,"ATTEMPT","DATA",null,true);
	}
});

function __onload() {
	console.log("__onload()");
	
	//algebra parser
	Util.chemParser = new CTATChemParser();
	
	//init workspace 
	var workspace = new Workspace("workspace");
	window.workspace = workspace;
	
	/// ***** INIT UI ****** ///
	var secretGuppy, GuppyUtil;
	window.__uiInit = function(problemData, expOptions) {
		console.log("initUI(), problemData:");
		var symbolList = problemData.symbols;
		
		workspace.setProblemConfig(problemData);
		workspace.expressionOptions = expOptions;
		
		//fix Guppy text() function (outputs "-n" as "neg(n)")
		let og = Guppy.prototype.text;
		Guppy.prototype.text = function() {
			let ret = og.call(this);
			console.log("og text gives "+ret);
			let negRegex = /neg\(/g,
				res;
			while (res = negRegex.exec(ret)) {
				let idx = res.index+4,
					parens = 1;
				while(idx++ < ret.length && parens > 0) {
					let c = ret.charAt(idx)
					if (c === "(") {
						parens++;
					} else if (c === ")") {
						parens--;
					}
				}
				ret = ret.slice(0, res.index) + '(-'+ret.slice(res.index+3, idx) +')'+ ret.slice(idx, ret.length);
			}
			console.log("our text gives "+ret);
			return ret;
		}
		
		//add our own "insert tree" function
		Guppy.prototype.typeInTree = function(tree) {
			console.log("typeInTree: "+tree.toString());
			this.activate();
			var symbols = workspace.getSymbols();
			var opPrecedence = {
				'VAR': 6,
				'CONST': 6,
				'EXP': 5,
				'ROOT': 5,
				'UMINUS': 4,
				'UPLUS': 4,
				'TIMES': 3,
				'PLUS': 2
			}
			var sciNotRegex = /^(\d(\.\d+)?)e(\+|-)(\d+)/;
			function enterStr(string) {
				for (let i = 0; i < string.length; i++) {
					let character = string.charAt(i),
						charCode = string.charCodeAt(i);
					(charCode >= 65 && charCode <= 90) && (character = 'shift+'+character.toLowerCase());  
					character === " " && (character = "space");
					Mousetrap.trigger(character);
				}
			}
			var enterNode = function(node, wrap) {
				console.log("enterNode: "+node.toString(), "wrap is ",wrap);
				wrap && enterStr('(');
				switch(node.operator) {
					case 'TIMES':
						let numerFactors = [],
							denomFactors = [];
						node.factors.forEach((factor) => {
							if (factor.exp > 0) {
								numerFactors.push(factor);
							} else {
								denomFactors.push(factor);
							}
						});
						if (denomFactors.length) {
							enterStr('(');
						}
						for (let i = 0; i < numerFactors.length; i++) {
							if (i > 0) {
								enterStr('*');
							}
							enterNode(numerFactors[i], (numerFactors.length > 1) && opPrecedence[numerFactors[i].operator] < opPrecedence['TIMES']);
						}
						if (denomFactors.length) {
							enterStr(')');
							enterStr('/');
						}
						for (let i = 0; i < denomFactors.length; i++) {
							if (i > 0) {
								enterStr('*');
							}
							enterNode(denomFactors[i], opPrecedence[denomFactors[i].operator] < opPrecedence['TIMES']);
						}
						if (denomFactors.length) {
							this.engine.right();
						}
						break;
					case 'PLUS':
						for (let i = 0; i < node.terms.length; i++) {
							if (node.terms[i].sign < 0) {
								enterStr('-');
							} else if (i > 0) {
								enterStr('+');
							}
							enterNode(node.terms[i], false);
						}
						break;
					case 'EXP':
						enterNode(node.base, opPrecedence[node.base.operator] < opPrecedence['EXP']);
						enterStr('^');
						enterNode(node.exponent, opPrecedence[node.exponent.operator] < opPrecedence['EXP']);
						this.engine.right();
						break;
					case 'ROOT':
						this.engine.insert_symbol("sqrt");
						enterNode(node.base, opPrecedence[node.base.operator] < opPrecedence['ROOT']);
						this.engine.right();
						break;
					case 'EQUAL': 
						enterNode(node.left, false);
						enterStr('=');
						enterNode(node.right, false);
						break;
					case 'UMINUS': 
					case 'UPLUS': 
						enterStr(node.operator === 'UMINUS' ? '-' : '+');
						enterNode(node.base, opPrecedence[node.base.operator] < opPrecedence['UMINUS']);
						break;
					case 'CONST':
						let valWPrecision = !isNaN(node.precision) ? node.value.toPrecision(node.precision) : String(node.value);
						let match, str;
						if (match = sciNotRegex.exec(valWPrecision)) {
							console.log(match);
							str = '10^'+(match[3]=== '-' ? '-' : '')+match[4];
							if (parseFloat(match[1]) !== 1) {
								str = '('+match[1]+'*'+str+')';
							}
							enterStr(str);
							this.engine.right();
						} else {
							str = valWPrecision;
							enterStr(str);
						}
						break;
					case 'VAR':
						if (symbols[node.variable]) {
							this.engine.insert_symbol(symbols[node.variable].guppyData.key);
						} else {
							enterStr(node.variable);
						}
						break;
					case 'LOG': 
						this.engine.insert_symbol('log');
						enterNode(node.val, false);
						this.engine.right();
						break;
				}
				wrap && enterStr(')');
			}.bind(this);
			
			enterNode(tree, false);
			this.deactivate();
		}
		
		Guppy.prototype.typeInString = function(string) {
			this.typeInTree(Util.chemParser.chemParse(string));
		};
		
		
		//Guppy init
		let pathArr = Util.scriptSrc().split('/');
		pathArr.pop();
		let symPath = pathArr.join('/')+'/mysyms.json';
		Guppy.init({
			"path":"https://cdn.ctat.cs.cmu.edu/releases/latest/guppy",
			"symbols":[symPath],
			"callback": ()=>{
				workspace.registerSymbols(symbolList);
				workspace.initSymbolListener();
			}
		});
		Guppy.set_illegal_input(/[a-zA-Z]/);
		
		//invisible Guppy editor for string to xml conversion
		secretGuppy = new Guppy("secret_guppy");

		Util.Guppy = {
			
			globalSymbols: [],
			
			/**
			*	Get the guppified xml and text output of an expression
			*/
			processString: function(string) {
				console.log("GuppyUtil.processString( "+string+" )");
				secretGuppy.engine.sel_all();
				secretGuppy.engine.sel_delete();
				secretGuppy.engine.sel_clear();
				let tree = Util.chemParser.chemParse(string);
				secretGuppy.typeInTree(tree);
				return {
					'xml': secretGuppy.xml(),
					'text': secretGuppy.text()
				}
			}
		};
		
		
		/** init tree menus **/
		workspace.initMenus(problemData);
		
		/** init buttons **/
		workspace.initComponentBtns(problemData);
		
		//window mousedown event 
		window.addEventListener('mousedown', (e)=>{
			let target = (e.target.tagName.toLowerCase() === "button") ? e.target.parentNode : e.target;
			if (!target.className.includes("ignore_mousedown")) {
				workspace.closeAllOptionMenus();
				let activeGuppy = workspace.getActiveGuppy();
				if (target.className.includes('symbol_btn')) {
					let symName;
					while (!(symName = target.getAttribute("data-symbol-name"))) {
						target = target.parentNode;
					}
					workspace.insertSymbol(symName);
					if (activeGuppy) {
						workspace.__needToRefocus = activeGuppy; //can't do it here bc of event order; defer
					}
				} else if (activeGuppy) {
					workspace.displaySymbolKeyboard(false);
					if(activeGuppy.doneOnBlur) {
						//trigger done on activeGuppy if necessary
						workspace.triggerGuppyDone(activeGuppy);
						console.log("window mousedown triggering guppy: "+activeGuppy.id);
					}
				}
			}
		});
		
		//WAS HERE
		
		CTATCommShell.commShell.addGlobalEventListener({
			processCommShellEvent: (evt, msg) => {
				console.log("commshell event: ",evt);
				if (evt === "SuccessMessage") {
					console.log("success msg",msg);
					let m = msg.getSuccessMessage();
					if (m === "qty_btn_pressed") {
						console.log("qty btn pressed; sending hint request");
						CTATCommShell.commShell.processComponentAction(new CTATSAI("hint", "ButtonPressed", "hint request"));
					}
				} else if (evt === "ShowHintsMessage") {
					console.log("show hints msg",msg);
					console.log("hints are ",hints);
					if (hints[0].includes("Use the dialog above to select the quantity you were trying to calculate")) {
						workspace.showQtySelector(getUnmatchedQtyList());
					}
				}
			}
		});
	}
}

//let navData = window.performance.getEntriesByType("navigation");
if (document.readyState === 'complete')
{
	console.log('Document is loaded');
	__onload();
} else {
	console.log('Document is not loaded');
	document.onreadystatechange = function() {		
		if (document.readyState === 'complete') {
			console.log("lib.js window.onload");
			__onload();
		}
	};
}

},{"./Util.js":10,"./Workspace.js":11}]},{},[12]);
