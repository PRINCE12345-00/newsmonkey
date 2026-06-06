import React from "react";
import spinner from "./spinner.gif";

export default class Spinner extends React.Component {
  render() {
    return (
      <div className="spinner-container">
        <img src={spinner} alt="spinner" className="spinner" />
      </div>
    );
  }
}