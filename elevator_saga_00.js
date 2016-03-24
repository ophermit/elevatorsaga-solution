{
    init: function(elevators, floors) {
        var queue = [];
        queue["up"] = [];
        queue["down"] = [];
        var LOAD_WARN = 0.8;

        floors.forEach(function(floor) {
            floor.on("up_button_pressed", function() {
                registerEvent(floor.floorNum(), "up");
            });
            floor.on("down_button_pressed", function() {
                registerEvent(floor.floorNum(), "down");
            });
        });

        elevators.forEach(function(elevator) {
            elevator.direction = "";
            elevator.on("idle", function() {
                whereToGo(elevator);
            });

            elevator.isStopped = function() {
                return elevator.destinationDirection() == "stopped" && elevator.destinationQueue.length == 0;
            }

            elevator.on("floor_button_pressed", function(floorNum) {
                goToFloor(elevator, floorNum, false);
            });

            elevator.on("passing_floor", function(floorNum, direction) {
                if (elevator.destinationQueue.indexOf(floorNum) > -1) { // check: if need to stop on this floor (because the elevator's queue is unsorted)
                    elevator.destinationQueue.splice(elevator.destinationQueue.indexOf(floorNum), 1);
                    goToFloor(elevator, floorNum, true);
                }

                if (!isAnyvatorHere(floorNum, elevator) && elevator.loadFactor() <= LOAD_WARN && queue[direction].indexOf(floorNum) > -1)
                    goToFloor(elevator, floorNum, true); // make an unscheduled stop to pick up passengers
            });

            elevator.on("stopped_at_floor", function(floorNum) {
                if (floorNum == floors.length - 1)
                    elevator.direction = "down"; // if last floor - only "down" direction possible
                else if (floorNum == 0)
                    elevator.direction = "up"; // if first floor - only "up" direction possible

                updateQueue(false, floorNum, elevator.direction);
            });
        });

        function isAnyvatorHere(floorNum, elevator) {
            var i = -1;
            while (++i < elevators.length) { // check: if any elevator is at the requested floor
                if (elevators[i] != elevator && elevators[i].currentFloor() == floorNum && elevators[i].destinationDirection() == 'stopped')
                    return true;
            }
            return false;
        }

        function goToFloor(elevator, floorNum, immediate) {
            if (elevator.destinationQueue.length == 0) { // if the queue is empty - set new direction of elevator based on the requested floor
                if (elevator.currentFloor() < floorNum)
                    elevator.direction = "up";
                else if (elevator.currentFloor() > floorNum)
                    elevator.direction = "down";
            } else if (immediate === false && elevator.destinationQueue.indexOf(floorNum) > -1) // if not immediate move and the elevator's queue already contains this floor - do nothing
                return;

            elevator.goToFloor(floorNum, immediate);
        }

        function updateQueue(addFlag, floorNum, direction) {
            if (addFlag === true && queue[direction].indexOf(floorNum) == -1) // add to floor queue
                queue[direction].push(floorNum);
            else if (addFlag === false && queue[direction].indexOf(floorNum) > -1) // remove form floor queue
                queue[direction].splice(queue[direction].indexOf(floorNum), 1);
            else
                return;
        }

        function registerEvent(floorNum, direction) { // register a new event of button click on a floor
            if (!sendToElevator(floorNum)) // try to send the event to the nearest free elevator
                updateQueue(true, floorNum, direction); // otherwise add the event to the appropriate queue
        }

        function getFromDownQueue() {
            var t = queue["down"].slice();
            t.sort(function(a, b) {return b - a});
            return t.length > 0 ? t[0] : -1;
        }

        function getFromUpQueue() {
            var t = queue["up"].slice();
            t.sort(function(a, b) {return a - b});
            return t.length > 0 ? t[0] : -1;
        }

        function whereToGo(elevator) { // select floor for "idle" elevator
            var whereTo = -1;
            if (elevator.direction == "down" && queue["up"].length > 0)
                whereTo = getFromUpQueue();
            else if (elevator.direction == "up" && queue["down"].length > 0)
                whereTo = getFromDownQueue();
            else if (elevator.direction == "up" && queue["up"].length > 0)
                whereTo = getFromUpQueue();
            else if (elevator.direction == "down" && queue["down"].length > 0)
                whereTo = getFromDownQueue();

            if (whereTo != -1) goToFloor(elevator, whereTo, false);
        }

        function sendToElevator(floorNum) {
            var i = -1;
            while (++i < elevators.length) { // check: if at least one elevator has this floor in queue - do nothing
                if (elevators[i].destinationQueue.length > 0 && elevators[i].destinationQueue.indexOf(floorNum) > -1) return true;
            }

            // get min idle elevator
            var selected = null;
            var min = 1000;
            elevators.forEach(function(elevator) {
                if (elevator.isStopped() && Math.abs(elevator.currentFloor() - floorNum) < min) {
                    min = Math.abs(elevator.currentFloor() - floorNum);
                    selected = elevator;
                }
            });

            if (selected != null) { // send the requested floor to the selected elevator
                goToFloor(selected, floorNum, false);
                return true;
            } else return false; // otherwise - bad try
        }

    },
        update: function(dt, elevators, floors) {
            // We normally don't need to do anything here
        }
}
