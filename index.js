// To avoid LOST ROBOT due to wrong input parameters
// TODO 1: validate input coordinates in regards to MAX_COORD
// TODO 2: validate instruction length
// TODO 3: add toUpperCase() onkeypress for instruction.
// TODO 4: check LOST code (might be questionable when to decided it's lost, either when == or >)
// TODO 5: validate input orientation to match standard char as defined in code related to ``
// TODO 6: Quote: "Each robot is processed sequentially, i.e., finishes executing the robot instructions before the next robot begins execution."
// But such "multiple-threading-robots-control-system" task requires a bit more time.
// TODO 7: FIx scalability issue with edge coordinates (500;300) => (5;3)
// TODO 8: Get more understanding, how "scent" should be implemented, and fix code

/*
Assumptions:
- "N" is ALWAYS default orientation (so that I can calculate new orientation based on the fact, that robot has turned left or right (rotated -90deg or +90deg))
*/
(function() {
    'use strict';

    var MAX_COORD = 50, // *100 for scale emulator
        // EDGE_SCALE = 100,
        GRID_POINT = 100 + 1, // (because of 2 borders), //px - But why ONE grid point? what if Robot should access to some place
        // ROBOT_SIZE = 30, // px
        LOST_MSG = 'LOST',
        ORIENTATIONS = 'NSEW',
        INSTRUCTIONS = 'RLF', // if future commands list extended, this should be changed
        INSTRUCTION_STRING_MAX_LENGTH = 100,
        DELAY_BETWEEN_OMMANDS = 4000; //ms

    /**
     * Dedicated "class" to work with Input parameters for transmitting to Robot
     */
    function Input() {
        var edge = document.querySelector('.edge');
        var initial = document.querySelector('.initial');
        var instruction = document.querySelector('.instruction');

        this.getData = function() {
            var edgeData = edge.value.split(' ');
            var ex = parseInt(edgeData[0])/* * EDGE_SCALE*/;
            var ey = parseInt(edgeData[1])/* * EDGE_SCALE*/;

            var initialData = initial.value.split(' ');
            var sx = parseInt(initialData[0]);
            var sy = parseInt(initialData[1]);
            var sorient = initialData[2];

            var instructionString = instruction.value.toUpperCase();

            if (sx > MAX_COORD || sy > MAX_COORD) {
                alert('Provided coordinate is out of edge');
                return;
            } else if (sx < 0 /*II or III quadrants*/ || sy < 0 /*III or IV quadrants*/) {
                // Boundaries: 1st Positive Quadrant only: [0;0 - ex;ey]
                alert('Out of Rectangular World Boundaries. Please change instructions.');
                return;
            }

            if (ORIENTATIONS.indexOf(sorient) === -1) {
                alert('Undefined orientation');
                return;
            }

            if (instructionString.length > INSTRUCTION_STRING_MAX_LENGTH) { // just in case, if html hackers will hack the page
                alert('Length of instruction string is more than ' + INSTRUCTION_STRING_MAX_LENGTH);
                return;
            }

            for (var i = 0; i < instructionString.length; i++) {
                if (INSTRUCTIONS.indexOf(instructionString[i]) === -1) {
                    alert('Undefined instruction: ' + instructionString[i]);
                    return;
                }
            }

            return {
                edgeX: ex,
                edgeY: ey,
                initialX: sx,
                initialY: sy,
                initialOrienation: sorient,
                instruction: instruction.value.toUpperCase()
            };

        };
    }

    /**
     * Dedicated "class" to work with Robot results
     * @param name - name of Robot to be used in CSS class for differentiation instances.
     */
    function Robot(name) {

        this.view = document.querySelector('.robot-' + name);

        this.init = function(data) {
            this.edgeX = data.edgeX;
            this.edgeY = data.edgeY;

            // Initial robot coordinates should be passed from InputData. 
            // Not sure why, but might be used for double check with current coordinates, meaning - no changes since last Robot activities.
            // we need to have internal flag `currentXY` so that we check state of Robot after every move.
            this.currentX = data.initialX;
            this.currentY = data.initialY;

            this.lost = (this.currentX > MAX_COORD || this.currentY > MAX_COORD);

            this.currentOrientation = data.initialOrienation;
            this.previousOrientation = data.initialOrienation;

            this.instruction = data.instruction;
        };

        // change Position of Robot (technical movement or CSS transition of left and bottom)

        this.correctPosition = function() {
            this.view.style.left = this.currentX + 'px';
            this.view.style.bottom = this.currentY + 'px';
        };

        var _coreMove = function(inputInstruction) {
            this.previousOrientation = this.currentOrientation;

            //
            // This code with deg. related ONLY to UI implementation for Robot work visualization. In real world it will be changed.
            //
            switch (inputInstruction) {
                case 'L':
                    switch (this.previousOrientation) {
                        case 'N':
                            this.view.style.transform = 'rotate(-180deg)';
                            this.currentOrientation = 'W';
                            break;
                        case 'W':
                            this.view.style.transform = 'rotate(-270deg)';
                            this.currentOrientation = 'S';
                            break;
                        case 'S':
                            this.view.style.transform = 'rotate(0deg)';
                            this.currentOrientation = 'E';
                            break;
                        case 'E':
                            this.view.style.transform = 'rotate(-90deg)';
                            this.currentOrientation = 'N';
                            break;
                    }
                    break;

                case 'R':
                    switch (this.previousOrientation) {
                        case 'N':
                            this.view.style.transform = 'rotate(0deg)';
                            this.currentOrientation = 'E';
                            break;
                        case 'E':
                            this.view.style.transform = 'rotate(90deg)';
                            this.currentOrientation = 'S';
                            break;
                        case 'S':
                            this.view.style.transform = 'rotate(180deg)';
                            this.currentOrientation = 'W';
                            break;
                        case 'W':
                            this.view.style.transform = 'rotate(270deg)';
                            this.currentOrientation = 'N';
                            break;
                    }
                    break;

                case 'F':
                    var value = 0,
                        lostReturnObject = {
                            x: this.currentX,
                            y: this.currentY,
                            orientation: this.currentOrientation,
                            lost: true
                        };

                    switch (this.currentOrientation) { //Yes, now we have to take into consideration new, changed orientation of Robot
                        case 'N':
                            value = parseInt(this.view.style.bottom) + GRID_POINT;
                            if (value > this.edgeY) {
                                // According requirements, we have to ignore it and simply move, but then show "LOST" as Robot result.
                                this.lost = true;
                                return lostReturnObject;

                                // But the smart way to program AI/Robot, would analysis fore-casted coordinate/boundary and show Error:
                                // throw new Error('Looks like, by continuing moving this way, Robot will be LOST. Please change instruction.');
                            } else {
                                this.view.style.bottom = value + 'px';
                                this.currentY = value;
                            }
                            break;
                        case 'S':
                            value = parseInt(this.view.style.bottom) - GRID_POINT;
                            if (value < 0) {
                                this.lost = true;
                                return lostReturnObject;
                            } else {
                                this.view.style.bottom = value + 'px';
                                this.currentY = value;
                            }
                            break;
                        case 'E':
                            value = parseInt(this.view.style.left) + GRID_POINT;
                            if (value > this.edgeX) {
                                this.lost = true;
                                return lostReturnObject;
                            } else {
                                this.view.style.left = value + 'px';
                                this.currentX = value;
                            }
                            break;
                        case 'W':
                            value = parseInt(this.view.style.left) - GRID_POINT;
                            if (value < 0) {
                                this.lost = true;
                                return lostReturnObject;
                            } else {
                                this.view.style.left = value + 'px';
                                this.currentX = value;
                            }
                            break;
                            // or vice versa if to use "top + right" pair.
                    }
                    break;
            }
        };

        this.move = function() {
            var interval, j = 0;

            if (this.lost) {
                this.leaveScent();
                return {
                    x: this.currentX,
                    y: this.currentY,
                    orientation: this.currentOrientation,
                    lost: true
                };
            } else {
                this.view.classList.remove('lost');
                this.view.style.transform = 'rotate(0deg)';
                this.correctPosition(); // if we don't correct position, then default is 0 => NaN
                document.dispatchEvent(new Event('disableSendBtn'));
            }

            // core code of delayed visualization how Robot works...
            interval = setInterval(function() {
                _coreMove.call(this, this.instruction[j]);

                var data = {
                    x: this.currentX,
                    y: this.currentY,
                    orientation: this.currentOrientation,
                    lost: this.lost,
                    instruction: this.instruction[j]
                };
                localStorage.setItem('robotData', JSON.stringify(data));
                document.dispatchEvent(new Event('checkState'));

                j++;
                if (j === this.instruction.length || this.lost) {
                    clearInterval(interval);
                    document.dispatchEvent(new Event('enableSendBtn'));
                }

                if (this.lost) {
                    this.view.classList.add('lost');
                }
            }.bind(this), DELAY_BETWEEN_OMMANDS);

            // Result of move should be either valid coordinate and position OR 'LOST'
            return {
                x: this.currentX, // final, successful coordinates of Robot, before LOST - the final grid position 
                y: this.currentY,
                orientation: this.currentOrientation, // final orientation, recognized by Houston
                lost: this.lost // flag defined by crossing boundaries or not.

            };
        };

        this.leaveScent = function() {
            console.log('Robot leaving scent... here');
        };
    }

    /**
     * Dedicated "class" to work with Robot results
     */
    function Output() {

        var command = document.querySelector('.output .command');
        var outputX = document.querySelector('.output .x');
        var outputY = document.querySelector('.output .y');
        var outputOrientation = document.querySelector('.output .orientation');
        var outputLost = document.querySelector('.output .lost');

        this.show = function(robotResultsData) {
            if (robotResultsData.instruction) {
                command.innerText = 'Command: ' + robotResultsData.instruction;
            }
            outputX.innerText = robotResultsData.x;
            outputY.innerText = robotResultsData.y;
            outputOrientation.innerText = robotResultsData.orientation;
            outputLost.innerText = robotResultsData.lost ? LOST_MSG : '';
        };

        this.clear = function() {
            command.innerText = '';
            outputX.innerText = '';
            outputY.innerText = '';
            outputOrientation.innerText = '';
            outputLost.innerText = '';
        };
    }

    /**
     * Technical "class" for demo purpose.
     */
    function Houston2Mars() {
        var sendTrigger = document.querySelector('.send');
        var inputController = new Input();
        var robotController = new Robot('opportunity');
        var outputData = new Output();

        this.getReady = function() {
            sendTrigger.onclick = function() {
                outputData.clear();
                var inputData = inputController.getData();
                if (inputData) {
                    robotController.init(inputData);
                }
                var robotResultsData = robotController.move();
                if (robotResultsData) {
                    outputData.show(robotResultsData);
                }
            };

            document.addEventListener('disableSendBtn', function() {
                sendTrigger.setAttribute('disabled', 'disabled');
            });

            document.addEventListener('enableSendBtn', function() {
                sendTrigger.removeAttribute('disabled');
            });

            document.addEventListener('checkState', function() {
                var robotResultsData;
                try {
                    robotResultsData = JSON.parse(localStorage.getItem('robotData'));
                } catch (ex) {
                    console.log(ex);
                }
                if (robotResultsData) {
                    outputData.show(robotResultsData);
                }
            });
        };
    }

    var houston2Mars = new Houston2Mars();
    houston2Mars.getReady();

}());
