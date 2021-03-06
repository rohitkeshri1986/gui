// Interface Item
// ==============
// Renders a representation of a single network interface.

"use strict";

import React from "react";
import _ from "lodash";
import { Button, ButtonGroup, Input, Panel, FormControls }
  from "react-bootstrap";

import networkCommon from "./networkCommon";

import ToggleSwitch from "../../components/ToggleSwitch";
import Disclosure from "../../components/Disclosure";

// FIXME: Change this component so that each prop is submitted separately,
// with proper propTypes and default props.
const InterfaceItem = React.createClass(
  { propTypes: { status: React.PropTypes.object
               , dhcp: React.PropTypes.bool
               , id: React.PropTypes.string
               , name: React.PropTypes.string
               , enabled: React.PropTypes.bool
               , updateInterface: React.PropTypes.func.isRequired
               , resetInterface: React.PropTypes.func.isRequired
               , toggleInterface: React.PropTypes.func.isRequired
               , configureInterface: React.PropTypes.func.isRequired
               }

  , mixins: [ networkCommon ]

  , getDefaultProps () {
      return (
        { enabled: false
        , status:
          { link_state: null
          , name: null
          , aliases: null
          }
        , currentLinkSpeed: "1000" // FIXME
        }
      );
    }

  , showAliases ( aliases ) {
    var aliasList = [];

    aliasList = _.map( aliases
                     , function createAliasSections ( alias, index ) {
                       let broadcast = null;
                       let netmask = null;
                       let addressLabel = "";
                       let address = null;

                       switch( alias.type ) {
                         case "INET":
                           addressLabel = "IPv4: "
                           break;

                         case "INET6":
                           addressLabel = "IPv6: "
                           break;
                       }

                       address = <div>
                                   <span className = "alias-attribute-label">
                                     { addressLabel }
                                   </span>
                                   <span className = "alias-attribute">
                                     { alias.address }
                                   </span>
                                 </div>;

                       if ( alias.netmask ) {
                         netmask = <div>
                                     <span className = "alias-attribute-label">
                                       { "Netmask:" }
                                     </span>
                                     <span className = "alias-attribute">
                                       { " /" + alias.netmask }
                                     </span>
                                   </div>;
                       }

                       if ( alias.broadcast ) {
                         broadcast = <div>
                                       <span className = "alias-attribute-label">
                                         { "Broadcast: "}
                                        </span>
                                       <span className = "alias-attribute">
                                        { alias.broadcast }
                                       </span>
                                     </div>;
                       }

                       return (
                         <div key = { index }
                              className = "network-alias">
                          { address }
                          { netmask }
                          { broadcast }
                         </div>
                       )
                     } );

    return aliasList;
  }

  , validate ( key, value ) {
    var responseStyle = null;
    switch( key ) {
      case "staticIP":
        if ( !this.isIPv4WithNetmask( value )
          && !this.props.dhcp
          && this.props.enabled ) {
          responseStyle = "error";
        }
    }
    return responseStyle;
  }

  , createLinkSpeedToggles ( speed, index ) {
      let buttonClasses = [ "disabled" ];

      if ( speed === this.props.currentLinkSpeed ) {
        buttonClasses.push( "active" );
      }

      return (
        <Button
          key = { index }
          className = { buttonClasses.join( " " ) }
        >
          { speed }
        </Button>
      );
    }

  , render () {
    const labelClassName = "col-xs-5";
    const wrapperClassName = "col-xs-7";
    const formClasses = { labelClassName, wrapperClassName };

    let nameClasses = [ "interface-name" ];
    let interfaceIsActive = false;
    let allowedLinkSpeeds = null;

    // FIXME: No such thing. Figure out how to represent real behavior at some point.
    var staticIPValue = "";
    var macAddress = "";
    var aliases = [];

    switch ( this.props.status.link_state ) {
      case "LINK_STATE_UP":
        interfaceIsActive = true;
        nameClasses.push( "interface-up" );
        allowedLinkSpeeds = [ "10", "100", "1000" ];
        break;

      case "LINK_STATE_DOWN":
        nameClasses.push( "interface-down" );
        allowedLinkSpeeds = [ "10", "100", "1000" ];
        break;

      case "LINK_STATE_UNKNOWN":
      default:
        nameClasses.push( "interface-unknown" );
        allowedLinkSpeeds = [];
        break;
    }

    /*if ( this.state.status.aliases ) {
      // Aliases in state override those in props
      aliases = this.state.status.aliases.slice();
    } else*/ if ( this.props.status.aliases ) {
      // TODO: Find some way to indicate a mismatch between configured aliases
      // and actual status.
      aliases = this.props.status.aliases.slice();
    }

    if ( !_.isEmpty( aliases ) ) {
      let macAddressAlias = _.find( aliases
                                  , { type: "LINK" }
                                  );
      if ( macAddressAlias ) {
        macAddress = macAddressAlias.address;
      }
    }
    // TODO: Update this for VLANs and LAGGs
    _.remove( aliases, { type: "LINK" } );

    // FIXME: There is no way this will work once we're presenting aliases as
    // equals, without a "static IP". Don't let it survive past then.
    /*if ( this.state.staticIPInProgress ) {
      staticIPValue = this.state.staticIPInProgress;
    } else {*/
      if ( !_.isEmpty( aliases ) ) {
        let staticIPAlias = aliases.shift();
        staticIPValue = staticIPAlias.address + "/" + staticIPAlias.netmask;
      }
    // } // Commenting out static IP edit handling for now

    let interfaceName = (
        <h2 className = { nameClasses.join( " " ) } >
          { this.props.status.name }
          <span className="interface-type">{ "Ethernet" }</span>
        </h2>
      );

    return (
      <Panel
        bsStyle = { interfaceIsActive
                  ? "success"
                  : "default"
                  }
        className = "interface-item"
        header = { interfaceName }
      >
        <form className="form-horizontal">

          {/* ENABLE/DISABLE INTERFACE TOGGLE */}
          <div className="form-group">
            <label className={ "control-label " + labelClassName } >
              { "Interface Enabled" }
            </label>
            <div className={ wrapperClassName }>
              <ToggleSwitch
                className = "pull-right"
                toggled = { Boolean( this.props.enabled ) }
                onChange = { ( e ) => this.props.toggleInterface( this.props.id ) }
              />
            </div>
          </div>

          {/* ENABLE/DISABLE DHCP TOGGLE */}
          <div className="form-group">
            <label className={ "control-label " + labelClassName } >
              { "DHCP" }
            </label>
            <div className={ wrapperClassName }>
              <ToggleSwitch
                className = "pull-right"
                toggled = { Boolean( this.props.dhcp ) }
                disabled = { !interfaceIsActive }
                // onChange = { () => this.props.toggleDHCP( this.props.id ) }
              />
            </div>
          </div>

          {/* STATIC IP ADDRESS INPUT */}
          <Input { ...formClasses }
            type = "text"
            label = "Static IP Address"
            value = { staticIPValue }
            // bsStyle = { this.validate( "staticIP", staticIPValue ) }
            disabled = { true /*this.props.dhcp || !interfaceIsActive*/ }
          />

          {/* LINK SPEED RADIO SET */}
          <div className="form-group">
            <label className={ "control-label " + labelClassName } >
              { "Link Speed" }
            </label>
            <div className={ wrapperClassName }>
              <ButtonGroup
                justified
                className = "btn-group-radio btn-group-radio-primary disabled"
              >
                { allowedLinkSpeeds.map( this.createLinkSpeedToggles ) }
              </ButtonGroup>
            </div>
          </div>

          {/* MAC ADDRESS DISPLAY */}
          <FormControls.Static { ...formClasses }
            label = { "MAC Address" }
            value = { macAddress }
          />

        </form>

        <Disclosure
          headerShow = "Aliases"
          headerHide = "Aliases"
          defaultExpsnded = { true } >
          { this.showAliases( aliases ) }
        </Disclosure>
      </Panel>
    );
  }
});

export default InterfaceItem;
