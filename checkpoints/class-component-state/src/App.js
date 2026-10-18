import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      person: {
        fullName: 'Ada Okafor',
        bio: 'Full-stack developer who loves turning ideas into clean, simple web apps. Currently learning React and enjoying every bit of it.',
        imgSrc: '/images/profile.svg',
        profession: 'Software Engineer',
      },
      shows: false,
      secondsSinceMount: 0,
    };
  }

  // Runs once, right after the component appears on the page
  componentDidMount() {
    this.intervalId = setInterval(() => {
      this.setState((prevState) => ({
        secondsSinceMount: prevState.secondsSinceMount + 1,
      }));
    }, 1000);
  }

  // Runs right before the component is removed, so the timer doesn't keep going
  componentWillUnmount() {
    clearInterval(this.intervalId);
  }

  toggleShow = () => {
    this.setState((prevState) => ({ shows: !prevState.shows }));
  };

  // 75 -> "00:01:15"
  formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
  }

  render() {
    const { person, shows, secondsSinceMount } = this.state;
    const { fullName, bio, imgSrc, profession } = person;

    return (
      <div className="App">
        <h1>Profile Viewer</h1>

        <button className="toggle-button" onClick={this.toggleShow}>
          {shows ? 'Hide Profile' : 'Show Profile'}
        </button>

        {shows && (
          <div className="profile-card">
            <img src={imgSrc} alt={fullName} className="profile-image" />
            <h2>{fullName}</h2>
            <p className="profession">{profession}</p>
            <p className="bio">{bio}</p>
          </div>
        )}

        <div className="timer">
          Time since component was mounted: <span>{this.formatTime(secondsSinceMount)}</span>
        </div>
      </div>
    );
  }
}

export default App;
