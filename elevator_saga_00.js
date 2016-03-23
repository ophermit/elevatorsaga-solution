{
    init: function(elevators, floors) {
        var queue = [];
        queue["up"] = [];
        queue["down"] = [];
        var LOAD_WARN = 0.8;

        _.each(floors, function(floor) {
            floor.on("up_button_pressed", function() {
                register_event(floor.floorNum(), "up");
            });
            floor.on("down_button_pressed", function() {
                register_event(floor.floorNum(), "down");
            });
        });

        var n_index = 0;
        _.each(elevators, function(elevator) {
            elevator.n_num = n_index++;
            elevator.s_dir = "";
            elevator.on("idle", function() {
                where_to_go(elevator);
            });

            elevator.is_stopped = function() {
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

                if (!is_anyvator_here(floorNum, elevator) && elevator.loadFactor() <= LOAD_WARN && queue[direction].indexOf(floorNum) > -1)
                    goToFloor(elevator, floorNum, true); // make an unscheduled stop to pick up passengers
            });

            elevator.on("stopped_at_floor", function(floorNum) {
                if (floorNum == floors.length - 1) elevator.s_dir = "down"; // if last floor - only "down" direction possible
                else if (floorNum == 0) elevator.s_dir = "up"; // if first floor - only "up" direction possible

                upd_queue(false, floorNum, elevator.s_dir);
            });
        });

        function is_anyvator_here(pn_floor, pn_elevator) {
            for (var nI = 0; nI < elevators.length; nI++) { // check if any elevator is at the requested floor
                if (elevators[nI] != pn_elevator && elevators[nI].currentFloor() == pn_floor && elevators[nI].destinationDirection() == 'stopped')
                    return true;
            }
            return false;
        }

        function goToFloor(po_elev, pn_floor, pb_now) {
            if (po_elev.destinationQueue.length == 0) { // if the queue is empty - set new direction of elevator based on the requested floor
                if (po_elev.currentFloor() < pn_floor) po_elev.s_dir = "up";
                else if (po_elev.currentFloor() > pn_floor) po_elev.s_dir = "down";
            } else if (pb_now === false && po_elev.destinationQueue.indexOf(pn_floor) > -1) // if not immediate move and the elevator's queue already contains this floor - do nothing
                return;

            po_elev.goToFloor(pn_floor, pb_now);
        }

        function upd_queue(pb_add, pn_floor, ps_dir) {
            if (pb_add === true && queue[ps_dir].indexOf(pn_floor) == -1) // add to floor queue
                queue[ps_dir].push(pn_floor);
            else if (pb_add === false && queue[ps_dir].indexOf(pn_floor) > -1) // remove form floor queue
                queue[ps_dir].splice(queue[ps_dir].indexOf(pn_floor), 1);
            else
                return;
        }

        function register_event(pn_floor, ps_dir) { // register a new event of button click on a floor
            if (!send_to_elevator(pn_floor)) // try to send the event to the nearest free elevator
                upd_queue(true, pn_floor, ps_dir); // otherwise add the event to the appropriate queue
        }

        function get_from_down_queue() {
            var v_t = queue["down"].slice();
            v_t.sort(function(a, b) {return b - a});
            return v_t.length > 0 ? v_t[0] : -1;
        }

        function get_from_up_queue() {
            var v_t = queue["up"].slice();
            v_t.sort(function(a, b) {return a - b});
            return v_t.length > 0 ? v_t[0] : -1;
        }

        function where_to_go(po_elevator) { // select floor for "idle" elevator
            var n_where = -1;
            if (po_elevator.s_dir == "down" && queue["up"].length > 0) n_where = get_from_up_queue();
            else if (po_elevator.s_dir == "up" && queue["down"].length > 0) n_where = get_from_down_queue();
            else if (po_elevator.s_dir == "up" && queue["up"].length > 0) n_where = get_from_up_queue();
            else if (po_elevator.s_dir == "down" && queue["down"].length > 0) n_where = get_from_down_queue();

            if (n_where != -1) goToFloor(po_elevator, n_where, false);
        }

        function send_to_elevator(pn_floor) {
            for (var nI = 0; nI < elevators.length; nI++) { // check: if at least one elevator has this floor in queue - do nothing
                elev = elevators[nI];
                if (elev.destinationQueue.length > 0 && elev.destinationQueue.indexOf(pn_floor) > -1 ) return true;
            }

            // get min idle elevator
            var selected = null;
            var n_min = 1000;
            elevators.forEach(function(po_elevator) {
                if (po_elevator.is_stopped() && Math.abs(po_elevator.currentFloor() - pn_floor) < n_min) {
                    n_min = Math.abs(po_elevator.currentFloor() - pn_floor);
                    selected = po_elevator;
                }
            });

            if (selected != null) { // send the requested floor to the selected elevator
                goToFloor(selected, pn_floor, false);
                return true;
            } else return false; // otherwise - bad try
        }

    },
        update: function(dt, elevators, floors) {
            // We normally don't need to do anything here
        }
}
