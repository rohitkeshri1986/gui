// VIEWER
// ======
// One of the primary display components in FreeNAS. The Viewer is capable of
// ingesting data sets or collections of "like" things, and displaying them in
// a variety of modes. It is similar in this way to a desktop client's browser
// window, though not limited to just displaying files.

"use strict";

import React from "react";
import _ from "lodash";
import { MenuItem, Button, NavDropdown, ButtonGroup, Nav, Navbar, Input }
  from "react-bootstrap";
import { History, RouteContext } from "react-router";

import viewerCommon from "./Viewer/mixins/viewerCommon";

import DL from "../utility/DebugLogger";
import Icon from "./Icon";
import DetailViewer from "./Viewer/DetailViewer";
import IconViewer from "./Viewer/IconViewer";
import TableViewer from "./Viewer/TableViewer";

// STYLESHEET
if ( process.env.BROWSER ) require( "./Viewer.less" );


// Main Viewer Wrapper Component
const Viewer = React.createClass(

  { contextTypes: { location: React.PropTypes.object }

  , mixins: [ viewerCommon, History, RouteContext ]

  , propTypes: { keyUnique: React.PropTypes.string.isRequired

               , searchKeys: React.PropTypes.instanceOf( Set )

               , itemData: React.PropTypes.array

               , routeParam: React.PropTypes.string

               , textRemaining: React.PropTypes.string
               , textUngrouped: React.PropTypes.string

               , filtersInitial: React.PropTypes.instanceOf( Set )
               , filtersAllowed: React.PropTypes.instanceOf( Set )

               , groupsInitial: React.PropTypes.instanceOf( Set )
               , groupsAllowed: React.PropTypes.instanceOf( Set )

               , columnsInitial: React.PropTypes.instanceOf( Set )
               , columnsAllowed: React.PropTypes.instanceOf( Set )

               , modeInitial: React.PropTypes.string
               , modesAllowed: React.PropTypes.instanceOf( Set )

               , groupBy: React.PropTypes.object
               }

  // LIFECYCLE
  , getDefaultProps: function () {
      return (
        { searchKeys       : new Set()

        , itemData         : []

        , routeParam       : ""

        , textRemaining    : ""
        , textUngrouped    : ""

        , filtersInitial   : new Set()
        , filtersAllowed   : new Set()

        , groupsInitial    : new Set()
        , groupsAllowed    : new Set()

        , columnsInitial   : new Set()
        , columnsAllowed   : new Set()

        , modeInitial      : "detail"
        , modesAllowed     : new Set( [ "detail", "icon", "table" ] )

        , groupBy: {}
        }
      );
    }

  , getInitialState: function () {
      return (
        { modeActive: this.props.modeInitial
        , columnsEnabled: this.props.columnsInitial
        , groupsEnabled: this.props.groupsInitial
        , filtersEnabled: this.props.filtersInitial
        , filteredData: { grouped: false
                        , groups: []
                        , remaining: { entries: [] }
                        , rawList: []
                        }
        , searchString: ""
        , selectedItem: this.props.params[ this.props.routeParam ]
        }
      );
    }

  , componentWillReceiveProps: function ( nextProps ) {
      this.processDisplayData({ itemData: nextProps.itemData });
    }


  // DATA HANDLING

    // processDisplayData applys filters, searches, and then groups before
    // handing the data to any of its sub-views. The structure is deliberately
    // generic so that any sub-view may display the resulting data as it
    // sees fit.
  , processDisplayData: function ( options ) {
      let displayParams =
        _.assign( { itemData: this.props.itemData
                  , searchString: this.state.searchString
                  , groupsEnabled: this.state.groupsEnabled
                  , filtersEnabled: this.state.filtersEnabled
                  }
                  , options
                );

      // Prevent function from modifying nextProps
      let workingCollection = _.cloneDeep( displayParams.itemData );
      let filteredData = { grouped: false
                         , groups: []
                         , remaining: {}
                         , rawList: []
                         };

      // Reduce the array by applying exclusion filters (defined in the view)
      // TODO: Debug this - doesn't work right!
      if ( displayParams.filtersEnabled.size > 0 ) {
        for ( let groupType of displayParams.filtersEnabled ) {
          _.remove( workingCollection
                  , this.props.groupBy[ groupType ].testProp
                  );
        }
      }

      // Reduce the array to only items which contain a substring match for the
      // searchString in either their primary or secondary keys
      if ( this.props.searchKeys.size > 0 && displayParams.searchString ) {
        workingCollection =
          _.filter( workingCollection
                  , function performSearch ( item ) {
                      let searchTarget = "";

                      for ( let key of this.props.searchKeys ) {
                        searchTarget += Boolean( item[ key ] );
                      }

                      return (
                        _.includes( searchTarget.toLowerCase()
                                  , displayParams.searchString.toLowerCase()
                                  )
                      );
                    }.bind( this )
                  );
      }

      // At this point, workingCollection is an ungrouped (but filtered) list of
      // items, useful for views like the table.
      filteredData["rawList"] = _.clone( workingCollection );

      // Convert array into object based on groups
      if ( displayParams.groupsEnabled.size > 0 ) {
        for ( let groupType of displayParams.groupsEnabled ) {
          let groupData  = this.props.groupBy[ groupType ];
          let newEntries = _.remove( workingCollection, groupData.testProp );

          filteredData.groups.push(
            { name: groupData.name
            , key: groupType
            , entries: newEntries
            }
          );
        }

        filteredData["grouped"] = true;
      } else {
        filteredData["grouped"] = false;
      }

      // All remaining items are put in the "remaining" property
      filteredData["remaining"] =
        { name: filteredData["grouped"]
              ? this.props.textRemaining
              : this.props.textUngrouped
        , entries: workingCollection
        };

      this.setState(
        { filteredData: filteredData
        , searchString: displayParams.searchString
        , groupsEnabled: displayParams.groupsEnabled
        , filtersEnabled: displayParams.filtersEnabled
        }
      );
    }

  , handleItemSelect: function ( selectionValue, event ) {
      let newSelection = null;

      if ( !_.isNumber( selectionValue ) || !_.isString( selectionValue ) ) {
        newSelection = selectionValue;
      }

      this.setState({ selectedItem: newSelection });
    }

  , handleSearchChange: function ( event ) {
      this.processDisplayData({ searchString: event.target.value });
    }

  , handleGroupsEnabledToggle: function ( targetGroup ) {
      if ( this.props.groupsAllowed.has( targetGroup ) ) {

        let newGroups = new Set( this.state.groupsEnabled );

        if ( newGroups.has( targetGroup ) ) {
          newGroups.delete( targetGroup );
        } else {
          newGroups.add( targetGroup );
        }

        this.processDisplayData({ groupsEnabled: newGroups });
      }
    }

  , handleFiltersEnabledToggle: function ( targetFilter ) {
      if ( this.props.groupsAllowed.has( targetFilter ) ) {

        let newFilters = new Set( this.state.filtersEnabled );

        if ( newFilters.has( targetFilter ) ) {
          newFilters.delete( targetFilter );
        } else {
          newFilters.add( targetFilter );
        }

        this.processDisplayData({ filtersEnabled: newFilters });
      }
    }

  , changeViewerMode: function ( targetMode ) {
      let newMode;

      // See if a disallowed mode has been requested
      if ( this.props.modesAllowed.has( targetMode ) ) {
        newMode = targetMode;
      } else {
        newMode = this.props.modeInitial;
      }

      // When changing viewer modes, close any previously open items.
      // TODO: This may need to change with single-click select functionality.
      this.history.pushState( null, `${ this.context.location.pathname }` );
      return newMode;
    }

  , handleModeSelect: function ( selectedKey, foo, bar ) {
      this.setState({ modeActive: this.changeViewerMode( selectedKey ) });
    }

  , changeTargetItem: function ( params ) {
      // Returns the first object from the input array whose selectionKey
      // matches the current route's dynamic portion. For instance,
      // "/accounts/users/root" with "bsdusr_usrname" as the selectionKey would
      // match the first object in itemData whose username === "root"
      return _.find( this.props.itemData
                   , function ( item ) {
                       return (
                         params[ this.props.routeParam ] ===
                         item[ this.props.keyUnique ]
                       );
                     }.bind( this )
                   );
    }


  // DISPLAY

  , createGroupMenuOption: function ( group, index ) {
      let toggleText = this.state.groupsEnabled.has( group )
                     ? "Don't group by "
                     : "Group by ";

      return (
        <MenuItem
          key     = { index }
          onClick = { this.handleGroupsEnabledToggle.bind( null, group ) }
        >
          { toggleText + this.props.groupBy[ group ].name.toLowerCase() }
        </MenuItem>
      );
    }

  , createFilterMenuOption: function ( filter, index ) {
      let toggleText = this.state.filtersEnabled.has( filter )
                     ? "Show "
                     : "Hide ";

      return (
        <MenuItem
          key     = { index }
          onClick = { this.handleFiltersEnabledToggle.bind( null, filter ) }
        >
          { toggleText + this.props.groupBy[ filter ].name.toLowerCase() }
        </MenuItem>
      );
    }

  , createModeNav: function ( mode, index ) {
      var modeIcons = { detail : "icon-document-alt"
                      , icon   : "icon-grid-2x2"
                      , table  : "icon-table"
                      , heir   : ""
                      };

      return (
        <Button
          onClick = { this.handleModeSelect.bind( this, mode ) }
          key = { index }
          active = { mode === this.state.modeActive }
        >
          <Icon glyph = { modeIcons[ mode ] } />
        </Button>
      );
    }

  , createViewerContent: function () {
      let ViewerContent = null;
      const commonProps =
        { handleItemSelect : this.handleItemSelect
        , columnsEnabled   : this.state.columnsEnabled
        , selectedItem     : this.state.selectedItem
        , searchString     : this.state.searchString
        , filteredData     : this.state.filteredData
        };

      switch ( this.state.modeActive ) {

        default:
          DL.warn( "Viewer defaulting to default mode." );
          // Fall through to "detail".

        case "detail":
          ViewerContent = DetailViewer;
          break;

        case "icon":
          ViewerContent = IconViewer;
          break;

        case "table":
          ViewerContent = TableViewer;
          break;
      }

      return (
        <ViewerContent { ...commonProps } { ...this.props } />
      );
    }

  , render: function () {
      let showMenu      = null;
      let groupMenu     = null;
      let viewerModeNav = null;

      // Create "Show" Menu
      if ( this.props.filtersAllowed.size > 0 ) {
        showMenu = (
          <NavDropdown
            id    = "filters-dropdown"
            title = "Show"
          >
            { Array.from( this.props.filtersAllowed )
                .map( this.createFilterMenuOption )
            }
          </NavDropdown>
        );
      }

      // Create "Group By" Menu
      if ( this.props.groupsAllowed.size > 0 ) {
        groupMenu = (
          <NavDropdown
            id    = "groups-dropdown"
            title = "Group"
          >
            { Array.from( this.props.groupsAllowed )
                .map( this.createGroupMenuOption )
            }
          </NavDropdown>
        );
      }


      // Create navigation mode icons
      if ( this.props.modesAllowed.size > 1 ) {
        viewerModeNav = (
          <ButtonGroup
            className =  { "navbar-btn pull-right btn-group-radio "
                         + "btn-group-radio-info"
                         }
            activeMode = { this.state.modeActive } >
            { Array.from( this.props.modesAllowed ).map( this.createModeNav ) }
          </ButtonGroup>
        );
      }

      return (
        <div className="viewer">
          <Navbar
            fluid
            inverse
            className = "viewer-nav heading-with-nav-addon"
          >
            {/* Searchbox for Viewer */}
            <Input
              type           = "text"
              placeholder    = "Search"
              groupClassName = "navbar-form navbar-left form-overlay"
              value          = { this.state.searchString }
              onChange       = { this.handleSearchChange }
              addonBefore    = { <Icon glyph ="icon-search" /> }
            />

            {/* Dropdown menus for filters and groups */}
            <Nav className="navbar-left">
              { showMenu }
              { groupMenu }
            </Nav>

            {/* Select view mode */}
            { viewerModeNav }

          </Navbar>

          { this.createViewerContent() }
        </div>
      );
    }

});

export default Viewer;
