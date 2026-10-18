import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav, Container, Card, Button, Row, Col } from 'react-bootstrap';

const cards = [
  {
    title: 'React',
    text: 'A JavaScript library for building user interfaces out of small, reusable components.',
    link: 'https://react.dev/',
  },
  {
    title: 'React Bootstrap',
    text: 'Bootstrap components rebuilt as React components, like the navbar and cards on this page.',
    link: 'https://react-bootstrap.github.io/',
  },
  {
    title: 'Node.js',
    text: 'Runs JavaScript outside the browser. npm and npx come with it and are used to create and run this app.',
    link: 'https://nodejs.org/en',
  },
];

function App() {
  return (
    // A fragment groups elements without adding an extra node to the page
    <>
      <div className="App">
        <Navbar bg="dark" data-bs-theme="dark" expand="lg">
          <Container>
            <Navbar.Brand href="#home">My First React App</Navbar.Brand>
            <Navbar.Toggle aria-controls="main-navbar" />
            <Navbar.Collapse id="main-navbar">
              <Nav className="me-auto">
                <Nav.Link href="#home">Home</Nav.Link>
                <Nav.Link href="#about">About</Nav.Link>
                <Nav.Link href="#contact">Contact</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Container className="py-5">
          <h1 className="text-center mb-5">Welcome to React</h1>

          <Row xs={1} md={3} className="g-4">
            {cards.map((card) => (
              <Col key={card.title}>
                <Card className="h-100 shadow-sm">
                  <Card.Body className="d-flex flex-column">
                    <Card.Title>{card.title}</Card.Title>
                    <Card.Text className="flex-grow-1">{card.text}</Card.Text>
                    <Button variant="primary" href={card.link} target="_blank" rel="noreferrer">
                      Learn more
                    </Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </div>
    </>
  );
}

export default App;
