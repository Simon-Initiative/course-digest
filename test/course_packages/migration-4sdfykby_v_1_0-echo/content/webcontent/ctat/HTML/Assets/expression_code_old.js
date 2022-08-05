function Expression (stringOrTree, optLabel) {
			var expId = "expression_"+(_expressionNum++);
			var _tokenNum = 0;
			var pointer = this;
			this.parens = 0;
			var operators = {};
			var tokenHistories = {};
			
			//create dom nodes
			var domNode = document.createElement('div');
			domNode.id = expId;
			domNode.classList.add("expression");
			var exprNode = document.createElement('div');
			exprNode.classList.add("expression");
			exprNode.classList.add("CTATTextField");
			domNode.appendChild(exprNode);
			var labelNode = null;
			var simpButtonNode = document.createElement('div');
			simpButtonNode.id = expId+"_simplify";
			simpButtonNode.classList.add("expression_simplify_btn");
			domNode.appendChild(simpButtonNode);
			//parse w/ algebra parser
			var expression = algebraParser.algParse(stringOrTree);
			if (!expression) {
				return null;
			}
			
			function createLabel(labelText) {
				labelNode = document.createElement('div');
				labelNode.classList.add("expression_label");
				labelNode.innerHTML = labelText + ' :';
				domNode.insertBefore(labelNode, domNode.firstChild);
			}
			
			optLabel && createLabel(optLabel);
			
			//gen html content based on parsed expression
			function handleTerminal(type, span, tree, content, container) {
				switch(type) {
					case "VAR" :
						span.addEventListener("click", function(e) {
							workspace.varClicked(e, pointer, tree);
							e.stopPropagation();
						});
					case "CONST":
						span.classList.add("expression_"+type.toLowerCase());
						span.innerHTML = (type == "CONST") ? ''+(Math.round(parseFloat(content,10)*1000)/1000) : content ;
						span.id = expId+"_token_"+(_tokenNum++);
						tree['__domNode'] = span;
						container.appendChild(span);
					break;
				}
			}
			function treeToSpan(tree, expContainer) {
				for (let i = 0; i < tree.parens; i++) {
					let lParen = document.createElement("span");
					lParen.classList.add("expression_operator_paren");
					lParen.innerHTML = "(";
					expContainer.appendChild(lParen);
				}
				var span = document.createElement("span");
				switch(tree.operator) {
					case "EQUAL" : 
						treeToSpan(tree.left, expContainer);
						span.classList.add("expression_operator_equals");
						span.innerHTML = "=";
						span.id = expId+"_token_"+(_tokenNum++);;
						tree['__domNode'] = span;
						expContainer.appendChild(span);
						treeToSpan(tree.right, expContainer);
					break;
					case "TIMES" :
					case "PLUS"  :
						let childList = (tree.operator == "TIMES") ? "factors" : "terms";
						span.classList.add("expression_operator_"+tree.operator.toLowerCase())
						tree[childList].forEach((child, idx) => {
							treeToSpan(child, expContainer);
							if (idx < tree[childList].length-1) {
								let opId = expId+"_token_"+(_tokenNum++);
								let spanClone = span.cloneNode();
								if (tree.operator == "TIMES") {
									spanClone.innerHTML = (tree[childList][idx+1].exp === -1) ? "&#xf7;" : "&#215;";
								} else {
									spanClone.innerHTML = (tree[childList][idx+1].sign === -1) ? "-" : "+";
								}
								spanClone.id = opId;
								expContainer.appendChild(spanClone);
								operators[opId] = [child, tree[childList][idx+1]];
						/*		
								spanClone.addEventListener(
									"click", 
									workspace.operatorClicked.bind(workspace, pointer, spanClone)
								);
						*/	
							}
						});
					break;
					case "UMINUS":
						if (tree.base.operator === "CONST" || tree.base.operator === "VAR") {
							handleTerminal(tree.base.operator, 
								span,
								tree,
								"-"+(tree.base.operator === "CONST" ? tree.base.value : tree.base.variable),
								expContainer
							);
						} else {
							
						}
					break;
					case "VAR" :
						handleTerminal("VAR", span, tree, tree.variable, expContainer);
					break;
					case "CONST":
						handleTerminal("CONST", span, tree, tree.value, expContainer);
					break;
				}
				for (let i = 0; i < tree.parens; i++) {
					let rParen = document.createElement("span");
					rParen.classList.add("expression_operator_paren");
					rParen.innerHTML = ")";
					expContainer.appendChild(rParen);
				}
			}
			treeToSpan(expression, exprNode);

			this.domNode = domNode;
			
			function updateView() {
				_tokenNum = 0;
				var toRemove;
				while((toRemove = exprNode.lastChild) && !toRemove.className.includes("expression_label")) {
					exprNode.removeChild(toRemove);
				}
				operators = {};
				treeToSpan(expression, exprNode);
			}
			
			function updateTokenHistory (tokenId, historyStr) {
				!(tokenHistories[tokenId]) && (tokenHistories[tokenId] = []);
				tokenHistories[tokenId].push(historyStr);
			}
			
			this.setLabel = function(newLabel) {
				console.log("expression.setLabel( "+newLabel+" )");
				optLabel = newLabel;
				if (labelNode) {
					labelNode.innerHTML = newLabel+' :';
				} else {
					createLabel(newLabel);
				}
			}
			
			this.toString = function() {
				var tokens = exprNode.querySelectorAll('span');
				var str = '';
				for(let i = 0; i < tokens.length; i++) {
					str += (tokens[i].innerHTML + ' ');
				}
				return str;
			};
			
			this.clone = function() {
				return new Expression(pointer.toString(), optLabel);
			};
			
			this.addParens = function(optStart, optEnd) {
				optStart = (optStart || exprNode.firstChild);
				optEnd = (optEnd || exprNode.lastChild);
				let lParen = document.createElement("span");
				lParen.classList.add("expression_operator_paren");
				lParen.innerHTML = '(';
				let rParen = document.createElement("span");
				rParen.classList.add("expression_operator_paren");
				rParen.innerHTML = ')';
				exprNode.insertBefore(lParen, optStart);
				optEnd.nextSibling ? exprNode.insertBefore(rParen, optEnd.nextSibling) : exprNode.appendChild(rParen);
			};
			
			this.removeParens = function(optStartId, optEndId) {
				optStartId = optStartId || exprNode.firstChild.nextSibling.id;
				optEndId =  optEndId || exprNode.lastChild.previousSibling.id;
				var optStart = exprNode.querySelector('#'+optStartId).previousSibling;
				var optEnd = exprNode.querySelector('#'+optEndId).nextSibling;
				if (optStart && optStart.className.includes('expression_operator_paren')
				&&	optEnd && optEnd.className.includes('expression_operator_paren')) {
					optStart.parentNode.removeChild(optStart);
					optEnd.parentNode.removeChild(optEnd);
				}
			}
			
			this.removeToken = function(tokenId) {
				var token = exprNode.querySelector("#"+tokenId);
				token.parentNode.removeChild(token);
				expression = algebraParser.algParse(pointer.toString());
			}
			
			this.setTokenVal = function(tokenId, value) {
				let token = exprNode.querySelector('#'+tokenId);
				if (token) {
					token.innerHTML = value;
					expression = algebraParser.algParse(pointer.toString());
					updateView();
				} else {
					console.warn("no token w/ id "+tokenId+" found in expression w/ id "+expId);
				}
			};
			
			this.enterTokenVal = function(tokenId) {
				let span = exprNode.querySelector('#'+tokenId);
				var oldContent = span.innerHTML;
				var input = document.createElement('input');
				input.type = "text";
				span.innerHTML = '';
				span.appendChild(input);
				span.classList.add("being-entered");
				function handleInput() {
					let val = input.value;
					if (span.className.includes("being-entered") && (val !== '')) {
						let parsed = algebraParser.algParse(val);
						if (parsed) {
							if (parsed.operator !== "CONST" && parsed.operator !== "VAR" && parsed.parens === 0) {
								val = "( "+val+" )";
							}
							pointer.setTokenVal(tokenId, val);
							span.classList.remove("being-entered");
						}
					}
				}
				input.addEventListener("blur", function() {
					handleInput();
				});
				input.addEventListener("keypress", function(e) {
					if (e.keyCode === 13) {
						input.blur();
					}
				});
				input.focus();
			};
			
			this.doOperation = function(operatorId, doClone) {
				var opNode = exprNode.querySelector("#"+operatorId),
					operands = operators[operatorId],
					leftTree = operands[0],
					rightTree = operands[1],
					leftTok = leftTree['__domNode'],
					rightTok = rightTree['__domNode'];
				if (leftTree && (leftTree.operator === "CONST" || (leftTree.base && leftTree.base.operator === "CONST"))
				&&  rightTree && (rightTree.operator === "CONST" || (rightTree.base && rightTree.base.operator === "CONST"))) {
					let operateOn = pointer,
						leftStr = leftTok.innerHTML,
						rightStr = rightTok.innerHTML;
					if (doClone) {
						let clone = pointer.clone();
						let regex = /expression_[0-9]*_(token_[0-9]*)/;
						let tokenId = regex.exec(operatorId)[1];
						let newOpId = clone.exprNode.id+'_'+tokenId;
						return clone.doOperation(newOpId, false);
					}
					evaluated = algebraParser.algEvaluate(leftStr+' '+opNode.innerHTML+' '+rightStr);
					evaluatedParsed = algebraParser.algParse(evaluated);
					operateOn.removeParens(rightTok.id, rightTok.id);
					operateOn.removeToken(operatorId);
					operateOn.removeToken(rightTok.id);
					operateOn.setTokenVal(leftTok.id, evaluated);
					if (evaluatedParsed.operator === "CONST") {
						operateOn.removeParens(leftTok.id, leftTok.id);
					}
					return operateOn;
				}
			};
		}