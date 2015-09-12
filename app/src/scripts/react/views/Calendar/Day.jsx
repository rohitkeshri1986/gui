// Day
// ===
// Component representing a day of a month

"use strict";

import React from "react";
import _ from "lodash";

import { Overlay, Popover } from "react-bootstrap";

import DragTarget from "../../components/DragTarget";
import DropTarget from "../../components/DropTarget";
import ScrubTask from "./TaskWidgets/ScrubTask";
import ScrubModal from "./TaskModals/ScrubModal";


const Day = React.createClass (
  { propTypes: { handleTaskAdd: React.PropTypes.func.isRequired
               , handleTaskRemove: React.PropTypes.func.isRequired
               , chooseDay: React.PropTypes.func.isRequired
               // Whether this is today's date
               , isToday: React.PropTypes.bool.isRequired
               // Whether this is the day selected by the user
               , isSelected: React.PropTypes.bool.isRequired
               // The day of the month this represents
               , dayOfMonth: React.PropTypes.number.isRequired
               , index: React.PropTypes.number.isRequired
               , tasks: React.PropTypes.array
               }

  , getInitialState () {
    return { activeTask: "" };
  }

  , toggleTask ( taskID ) {
    if ( this.state.activeTask !== taskID ) {
      this.setState( { activeTask: taskID } );
    } else {
      this.setState( { activeTask: "" } );
    }
  }

  , createTasks () {
    var tasks = this.props.tasks;
    if ( _.has( this, [ "state", "tasks" ] ) ){
      tasks = this.state.tasks;
    }
    var taskDisplay =
      _.map( tasks
           , function createTaskItem ( task, index ) {
             var taskWidget;
             var taskModal;

             switch ( task.name ) {
               case "zfs.pool.scrub":
                 taskWidget =
                   <ScrubTask
                     volumeName = { task.args[0] || null }
                     toggleTask = { this.toggleTask.bind( this, task.id ) }
                     ref = { task.id }/>;
                 taskModal =
                   <Popover id = { task.id }>
                     <ScrubModal { ...task } />
                   </Popover>;
                 break;
               case "disks.test":
                 break;
             }

             return (
               <div
                 key = { index }
                 namespace = "calendar">
                 { taskWidget }
                 <Overlay
                   show = { this.state.activeTask === task.id }
                   placement = "bottom"
                   target = { ()=> React.findDOMNode( this.refs[ this.state.activeTask ] ) }>
                   { taskModal }
                 </Overlay>
               </div>
             );
           }
           , this
           );
    return taskDisplay;

  }

  , render () {
    var dayClass = [ "day" ];

    if ( this.props.isToday ) {
      dayClass.push( "today" );
    }
    if ( this.props.isSelected ) {
      dayClass.push( "selected" );
    }

    return (
      <div
        key={ this.props.index }
        className= { dayClass.join( " " ) }
        onClick = { this.props.chooseDay.bind( null, this.props.dayOfMonth ) }>
        <DropTarget
          className="day-content"
          callback={ this.props.handleTaskAdd }
          namespace="calendar"
          activeDrop>
          <span className="day-numeral">{ this.props.dayOfMonth }</span>
          { this.createTasks() }
        </DropTarget>
      </div>
    );
  }
});

export default Day;