#include <Arduino.h>

// ==========================================
// PIN CONFIGURATION
// ==========================================
// L298N Motor Driver Pins
const int ENA = 5;  // PWM Left Motor
const int IN1 = 2;  // Left Motor Direction 1
const int IN2 = 3;  // Left Motor Direction 2
const int IN3 = 4;  // Right Motor Direction 1
const int IN4 = 7;  // Right Motor Direction 2
const int ENB = 6;  // PWM Right Motor

// IR Line Sensors (Digital)
const int PIN_SENSOR_LEFT   = 8;
const int PIN_SENSOR_CENTER = 9;
const int PIN_SENSOR_RIGHT  = 10;

// Buzzer
const int PIN_BUZZER = 11;

// Sensor Detection Threshold (LOW = Black line detected for active-low IR sensors)
const int LINE_DETECTED = LOW;

// Motor Speed Constants (0 - 255)
const int BASE_SPEED = 180;
const int TURN_SPEED = 150;

// ==========================================
// ROBOT STATES
// ==========================================
enum RobotState {
  STATE_STOPPED,
  STATE_FOLLOWING,
  STATE_SEARCHING,
  STATE_MONITOR
};

RobotState currentState = STATE_STOPPED;
bool buzzerActive = false;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 100; // ms

// Telemetry variables
int rawLeft = 0;
int rawCenter = 0;
int rawRight = 0;
bool lineLeft = false;
bool lineCenter = false;
bool lineRight = false;
int motorLeftSpeed = 0;
int motorRightSpeed = 0;
String currentDirection = "detenido";
String currentStatusStr = "detenido";

// ==========================================
// MOTOR CONTROL FUNCTIONS
// ==========================================
void setMotors(int speedLeft, int speedRight, bool dirLeftFwd, bool dirRightFwd) {
  motorLeftSpeed = abs(speedLeft);
  motorRightSpeed = abs(speedRight);

  digitalWrite(IN1, dirLeftFwd ? HIGH : LOW);
  digitalWrite(IN2, dirLeftFwd ? LOW : HIGH);
  analogWrite(ENA, motorLeftSpeed);

  digitalWrite(IN3, dirRightFwd ? HIGH : LOW);
  digitalWrite(IN4, dirRightFwd ? LOW : HIGH);
  analogWrite(ENB, motorRightSpeed);
}

void stopMotors() {
  motorLeftSpeed = 0;
  motorRightSpeed = 0;
  currentDirection = "detenido";
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, 0);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
  analogWrite(ENB, 0);
}

void moveForward() {
  currentDirection = "adelante";
  setMotors(BASE_SPEED, BASE_SPEED, true, true);
}

void turnLeft() {
  currentDirection = "izquierda";
  setMotors(TURN_SPEED / 2, TURN_SPEED, false, true);
}

void turnRight() {
  currentDirection = "derecha";
  setMotors(TURN_SPEED, TURN_SPEED / 2, true, false);
}

void spinLeft() {
  currentDirection = "izquierda";
  setMotors(TURN_SPEED, TURN_SPEED, false, true);
}

// ==========================================
// BUZZER CONTROL
// ==========================================
void setBuzzer(bool active) {
  buzzerActive = active;
  digitalWrite(PIN_BUZZER, buzzerActive ? HIGH : LOW);
}

// ==========================================
// TELEMETRY REPORTR (JSON format)
// ==========================================
void sendTelemetry() {
  Serial.print("{\"status\":\"");
  Serial.print(currentStatusStr);
  Serial.print("\",\"left\":");
  Serial.print(lineLeft ? 1 : 0);
  Serial.print(",\"center\":");
  Serial.print(lineCenter ? 1 : 0);
  Serial.print(",\"right\":");
  Serial.print(lineRight ? 1 : 0);
  Serial.print(",\"dir\":\"");
  Serial.print(currentDirection);
  Serial.print("\",\"mLeft\":");
  Serial.print(motorLeftSpeed);
  Serial.print(",\"mRight\":");
  Serial.print(motorRightSpeed);
  Serial.print(",\"buzzer\":");
  Serial.print(buzzerActive ? "true" : "false");
  Serial.println("}");
}

// ==========================================
// SERIAL COMMAND PARSER
// ==========================================
void parseCommand(String cmd) {
  cmd.trim();
  cmd.toUpperCase();

  if (cmd == "START" || cmd == "{\"CMD\":\"START\"}") {
    currentState = STATE_FOLLOWING;
    currentStatusStr = "seguimiento";
  } else if (cmd == "STOP" || cmd == "{\"CMD\":\"STOP\"}") {
    currentState = STATE_STOPPED;
    currentStatusStr = "detenido";
    stopMotors();
  } else if (cmd == "BUZZER_ON" || cmd == "{\"CMD\":\"BUZZER_ON\"}") {
    setBuzzer(true);
  } else if (cmd == "BUZZER_OFF" || cmd == "{\"CMD\":\"BUZZER_OFF\"}") {
    setBuzzer(false);
  } else if (cmd == "MONITOR" || cmd == "{\"CMD\":\"MONITOR\"}") {
    currentState = STATE_MONITOR;
    currentStatusStr = "monitoreo";
    stopMotors();
  }
}

void checkSerialInput() {
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    if (input.length() > 0) {
      parseCommand(input);
    }
  }
}

// ==========================================
// SETUP & LOOP
// ==========================================
void setup() {
  // Initialize Serial at 9600 baud rate
  Serial.begin(9600);

  // Initialize Motor Pins
  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENB, OUTPUT);
  stopMotors();

  // Initialize Sensor Pins
  pinMode(PIN_SENSOR_LEFT, INPUT);
  pinMode(PIN_SENSOR_CENTER, INPUT);
  pinMode(PIN_SENSOR_RIGHT, INPUT);

  // Initialize Buzzer
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
}

void loop() {
  // Read Serial commands from Frontend
  checkSerialInput();

  // Read Sensors
  rawLeft = digitalRead(PIN_SENSOR_LEFT);
  rawCenter = digitalRead(PIN_SENSOR_CENTER);
  rawRight = digitalRead(PIN_SENSOR_RIGHT);

  lineLeft = (rawLeft == LINE_DETECTED);
  lineCenter = (rawCenter == LINE_DETECTED);
  lineRight = (rawRight == LINE_DETECTED);

  // State Machine Logic
  switch (currentState) {
    case STATE_STOPPED:
      stopMotors();
      currentStatusStr = "detenido";
      break;

    case STATE_MONITOR:
      stopMotors();
      currentStatusStr = "monitoreo";
      break;

    case STATE_FOLLOWING:
    case STATE_SEARCHING:
      if (lineCenter && !lineLeft && !lineRight) {
        // Line straight ahead
        currentState = STATE_FOLLOWING;
        currentStatusStr = "seguimiento";
        moveForward();
      } else if (lineLeft && !lineRight) {
        // Line on the left
        currentState = STATE_FOLLOWING;
        currentStatusStr = "seguimiento";
        turnLeft();
      } else if (lineRight && !lineLeft) {
        // Line on the right
        currentState = STATE_FOLLOWING;
        currentStatusStr = "seguimiento";
        turnRight();
      } else if (lineLeft && lineCenter && lineRight) {
        // All sensors detect line (crossing or wide line)
        currentState = STATE_FOLLOWING;
        currentStatusStr = "seguimiento";
        moveForward();
      } else if (!lineLeft && !lineCenter && !lineRight) {
        // Lost line -> Searching
        currentState = STATE_SEARCHING;
        currentStatusStr = "buscando";
        spinLeft(); // Spin to relocate line
      }
      break;
  }

  // Periodic Telemetry Transmission
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = currentMillis;
    sendTelemetry();
  }
}
