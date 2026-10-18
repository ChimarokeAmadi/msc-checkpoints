import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Card, Button, Badge } from 'react-bootstrap';
import Name from './components/Name';
import Price from './components/Price';
import Description from './components/Description';
import Image from './components/Image';
import './App.css';

// Put your first name here. Leave it as '' to see "Hello, there!"
const firstName = 'Chimaroke';

function App() {
  return (
    <div className="App">
      <Card className="product-card">
        <div className="image-wrapper">
          <Image />
          <Badge bg="danger" className="new-badge">
            New
          </Badge>
        </div>

        <Card.Body>
          <Name />
          <Description />

          <div className="card-footer-row">
            <Price />
            <Button className="buy-button">Add to cart</Button>
          </div>
        </Card.Body>
      </Card>

      <div className="greeting">
        {firstName && <img className="greeting-image" src="/images/wave.svg" alt="Smiling face" />}
        <p>Hello, {firstName ? firstName : 'there'}!</p>
      </div>
    </div>
  );
}

export default App;
