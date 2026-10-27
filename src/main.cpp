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

// Motor Speed Constants & Variables
const int DEFAULT_SPEED = 180;
const int MIN_SPEED = 100;
const int MAX_SPEED = 255;

int currentSpeed = DEFAULT_SPEED;
int turnSpeed = 150;

// ==========================================
// OPERATING MODES & ROBOT STATES
// ==========================================
enum OperatingMode {
  MODE_AUTO,
  MODE_MANUAL,
  MODE_RUTAS
};

enum RobotStatus {
  STATUS_STOPPED,
  STATUS_FOLLOWING,
  STATUS_SEARCHING,
  STATUS_MANUAL,
  STATUS_ROUTE_EXECUTING,
  STATUS_ROUTE_COMPLETED,
  STATUS_MONITOR
};

OperatingMode currentMode = MODE_AUTO;
RobotStatus currentStatus = STATUS_STOPPED;

bool buzzerActive = false;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL = 100; // ms

// Safety Timeout for Manual Mode (ms)
unsigned long lastManualCmdTime = 0;
const unsigned long MANUAL_TIMEOUT = 500; // ms
bool manualMoving = false;

// Route Constants & Storage
const int MAX_ROUTE_STEPS = 20;
enum RouteStepType {
  STEP_FW_REF,      // Move forward following line until intersection reference
  STEP_TURN_LEFT,   // Turn left at intersection
  STEP_TURN_RIGHT,  // Turn right at intersection
  STEP_STOP         // Stop at destination
};

RouteStepType routeSteps[MAX_ROUTE_STEPS];
int routeTotalSteps = 0;
int currentRouteStepIndex = 0;
String lastReferenceName = "Inicio";
bool intersectionTriggered = false;
unsigned long intersectionDebounceTime = 0;

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

// Helper functions for status and mode strings
String getModeString() {
  switch (currentMode) {
    case MODE_AUTO: return "AUTO";
    case MODE_MANUAL: return "MANUAL";
    case MODE_RUTAS: return "RUTAS";
    default: return "AUTO";
  }
}

String getStatusString() {
  switch (currentStatus) {
    case STATUS_STOPPED: return "detenido";
    case STATUS_FOLLOWING: return "seguimiento";
    case STATUS_SEARCHING: return "buscando";
    case STATUS_MANUAL: return "manual";
    case STATUS_ROUTE_EXECUTING: return "ejecutando_ruta";
    case STATUS_ROUTE_COMPLETED: return "ruta_completada";
    case STATUS_MONITOR: return "monitoreo";
    default: return "detenido";
  }
}

// ==========================================
// MOTOR CONTROL FUNCTIONS
// ==========================================
void setMotors(int speedLeft, int speedRight, bool dirLeftFwd, bool dirRightFwd) {
  motorLeftSpeed = constrain(abs(speedLeft), 0, 255);
  motorRightSpeed = constrain(abs(speedRight), 0, 255);

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
  manualMoving = false;
}

void moveForward(int speed) {
  currentDirection = "adelante";
  setMotors(speed, speed, true, true);
}

void moveBackward(int speed) {
  currentDirection = "atras";
  setMotors(speed, speed, false, false);
}

void turnLeft(int speed) {
  currentDirection = "izquierda";
  setMotors(speed / 2, speed, false, true);
}

void turnRight(int speed) {
  currentDirection = "derecha";
  setMotors(speed, speed / 2, true, false);
}

void spinLeft(int speed) {
  currentDirection = "izquierda";
  setMotors(speed, speed, false, true);
}

void spinRight(int speed) {
  currentDirection = "derecha";
  setMotors(speed, speed, true, false);
}

// Switch Mode safely
void switchMode(OperatingMode newMode) {
  stopMotors();
  currentMode = newMode;
  currentStatus = STATUS_STOPPED;
  manualMoving = false;
}

// Emergency stop handler
void emergencyStop() {
  stopMotors();
  currentStatus = STATUS_STOPPED;
  manualMoving = false;
}

// ==========================================
// BUZZER CONTROL
// ==========================================
void setBuzzer(bool active) {
  buzzerActive = active;
  digitalWrite(PIN_BUZZER, buzzerActive ? HIGH : LOW);
}

// ==========================================
// TELEMETRY REPORT (JSON format)
// ==========================================
void sendTelemetry() {
  Serial.print("{\"mode\":\"");
  Serial.print(getModeString());
  Serial.print("\",\"status\":\"");
  Serial.print(getStatusString());
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
  Serial.print(",\"speed\":");
  Serial.print(currentSpeed);
  Serial.print(",\"buzzer\":");
  Serial.print(buzzerActive ? "true" : "false");
  Serial.print(",\"routeStep\":");
  Serial.print(routeTotalSteps > 0 ? (currentRouteStepIndex + 1) : 0);
  Serial.print(",\"routeTotal\":");
  Serial.print(routeTotalSteps);
  Serial.print(",\"lastRef\":\"");
  Serial.print(lastReferenceName);
  Serial.println("\"}");
}

// ==========================================
// SERIAL COMMAND PARSER
// ==========================================
void parseCommand(String cmd) {
  cmd.trim();

  // Extract command from JSON wrapper if present (e.g. {"CMD":"..."})
  if (cmd.startsWith("{") && cmd.endsWith("}")) {
    int cmdIdx = cmd.indexOf("\"CMD\":\"");
    if (cmdIdx != -1) {
      int startQuote = cmdIdx + 7;
      int endQuote = cmd.indexOf("\"", startQuote);
      if (endQuote != -1) {
        cmd = cmd.substring(startQuote, endQuote);
      }
    }
  }

  cmd.toUpperCase();

  // Emergency stop & global commands
  if (cmd == "STOP" || cmd == "EMERGENCY_STOP") {
    emergencyStop();
    return;
  } else if (cmd == "BUZZER_ON") {
    setBuzzer(true);
    return;
  } else if (cmd == "BUZZER_OFF") {
    setBuzzer(false);
    return;
  } else if (cmd == "MONITOR") {
    switchMode(currentMode);
    currentStatus = STATUS_MONITOR;
    return;
  }

  // Mode switching
  if (cmd == "MODE:AUTO" || cmd == "SET_MODE AUTO") {
    switchMode(MODE_AUTO);
    return;
  } else if (cmd == "MODE:MANUAL" || cmd == "SET_MODE MANUAL") {
    switchMode(MODE_MANUAL);
    return;
  } else if (cmd == "MODE:RUTAS" || cmd == "SET_MODE RUTAS") {
    switchMode(MODE_RUTAS);
    return;
  }

  // Speed setting
  if (cmd.startsWith("SPEED:")) {
    int val = cmd.substring(6).toInt();
    if (val >= MIN_SPEED && val <= MAX_SPEED) {
      currentSpeed = val;
      turnSpeed = constrain(val - 30, MIN_SPEED, MAX_SPEED);
    }
    return;
  }

  // Commands based on current mode
  if (currentMode == MODE_AUTO) {
    if (cmd == "START") {
      currentStatus = STATUS_FOLLOWING;
    }
  } else if (currentMode == MODE_MANUAL) {
    if (cmd.startsWith("MANUAL:")) {
      String subCmd = cmd.substring(7);
      lastManualCmdTime = millis();
      currentStatus = STATUS_MANUAL;

      if (subCmd == "FW" || subCmd == "FORWARD") {
        moveForward(currentSpeed);
        manualMoving = true;
      } else if (subCmd == "BW" || subCmd == "BACKWARD") {
        moveBackward(currentSpeed);
        manualMoving = true;
      } else if (subCmd == "LEFT") {
        turnLeft(currentSpeed);
        manualMoving = true;
      } else if (subCmd == "RIGHT") {
        turnRight(currentSpeed);
        manualMoving = true;
      } else if (subCmd == "SPIN_LEFT") {
        spinLeft(currentSpeed);
        manualMoving = true;
      } else if (subCmd == "SPIN_RIGHT") {
        spinRight(currentSpeed);
        manualMoving = true;
      } else if (subCmd == "STOP") {
        stopMotors();
        currentStatus = STATUS_STOPPED;
      }
    }
  } else if (currentMode == MODE_RUTAS) {
    if (cmd == "ROUTE:CLEAR") {
      routeTotalSteps = 0;
      currentRouteStepIndex = 0;
      lastReferenceName = "Inicio";
      stopMotors();
      currentStatus = STATUS_STOPPED;
    } else if (cmd.startsWith("ROUTE:ADD:")) {
      String stepStr = cmd.substring(10);
      if (routeTotalSteps < MAX_ROUTE_STEPS) {
        if (stepStr == "FW_REF") {
          routeSteps[routeTotalSteps++] = STEP_FW_REF;
        } else if (stepStr == "TURN_LEFT") {
          routeSteps[routeTotalSteps++] = STEP_TURN_LEFT;
        } else if (stepStr == "TURN_RIGHT") {
          routeSteps[routeTotalSteps++] = STEP_TURN_RIGHT;
        } else if (stepStr == "STOP") {
          routeSteps[routeTotalSteps++] = STEP_STOP;
        }
      }
    } else if (cmd == "ROUTE:START" || cmd == "START") {
      if (routeTotalSteps > 0) {
        currentRouteStepIndex = 0;
        currentStatus = STATUS_ROUTE_EXECUTING;
        lastReferenceName = "Inicio";
        intersectionTriggered = false;
      }
    } else if (cmd == "ROUTE:PAUSE" || cmd == "ROUTE:STOP") {
      stopMotors();
      currentStatus = STATUS_STOPPED;
    }
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
  checkSerialInput();

  // Read Sensors
  rawLeft = digitalRead(PIN_SENSOR_LEFT);
  rawCenter = digitalRead(PIN_SENSOR_CENTER);
  rawRight = digitalRead(PIN_SENSOR_RIGHT);

  lineLeft = (rawLeft == LINE_DETECTED);
  lineCenter = (rawCenter == LINE_DETECTED);
  lineRight = (rawRight == LINE_DETECTED);

  // Handle Manual Mode Safety Timeout
  if (currentMode == MODE_MANUAL && manualMoving) {
    if (millis() - lastManualCmdTime > MANUAL_TIMEOUT) {
      stopMotors();
      currentStatus = STATUS_STOPPED;
    }
  }

  // Handle Mode Logic
  if (currentStatus == STATUS_STOPPED || currentStatus == STATUS_MONITOR) {
    stopMotors();
  } else if (currentMode == MODE_AUTO) {
    if (currentStatus == STATUS_FOLLOWING || currentStatus == STATUS_SEARCHING) {
      if (lineCenter && !lineLeft && !lineRight) {
        currentStatus = STATUS_FOLLOWING;
        moveForward(currentSpeed);
      } else if (lineLeft && !lineRight) {
        currentStatus = STATUS_FOLLOWING;
        turnLeft(currentSpeed);
      } else if (lineRight && !lineLeft) {
        currentStatus = STATUS_FOLLOWING;
        turnRight(currentSpeed);
      } else if (lineLeft && lineCenter && lineRight) {
        currentStatus = STATUS_FOLLOWING;
        moveForward(currentSpeed);
      } else if (!lineLeft && !lineCenter && !lineRight) {
        currentStatus = STATUS_SEARCHING;
        spinLeft(currentSpeed);
      }
    }
  } else if (currentMode == MODE_RUTAS) {
    if (currentStatus == STATUS_ROUTE_EXECUTING) {
      if (currentRouteStepIndex >= routeTotalSteps) {
        stopMotors();
        currentStatus = STATUS_ROUTE_COMPLETED;
        lastReferenceName = "Destino Alcanzado";
      } else {
        RouteStepType currentStep = routeSteps[currentRouteStepIndex];

        switch (currentStep) {
          case STEP_FW_REF: {
            // Check for intersection reference: all 3 sensors hit black or T-junction
            bool isIntersection = (lineLeft && lineCenter && lineRight) || (lineLeft && lineRight);

            if (isIntersection && !intersectionTriggered && (millis() - intersectionDebounceTime > 500)) {
              intersectionTriggered = true;
              intersectionDebounceTime = millis();
              currentRouteStepIndex++;
              lastReferenceName = "Intersección " + String(currentRouteStepIndex);
            } else {
              if (!isIntersection) {
                intersectionTriggered = false;
              }
              // Normal line following towards reference
              if (lineCenter && !lineLeft && !lineRight) {
                moveForward(currentSpeed);
              } else if (lineLeft && !lineRight) {
                turnLeft(currentSpeed);
              } else if (lineRight && !lineLeft) {
                turnRight(currentSpeed);
              } else {
                moveForward(currentSpeed);
              }
            }
            break;
          }

          case STEP_TURN_LEFT: {
            // Spin left until center sensor re-acquires the line
            spinLeft(currentSpeed);
            if (lineCenter && !lineLeft && (millis() - intersectionDebounceTime > 300)) {
              currentRouteStepIndex++;
              lastReferenceName = "Giro Izquierda OK";
              intersectionDebounceTime = millis();
            }
            break;
          }

          case STEP_TURN_RIGHT: {
            // Spin right until center sensor re-acquires the line
            spinRight(currentSpeed);
            if (lineCenter && !lineRight && (millis() - intersectionDebounceTime > 300)) {
              currentRouteStepIndex++;
              lastReferenceName = "Giro Derecha OK";
              intersectionDebounceTime = millis();
            }
            break;
          }

          case STEP_STOP: {
            stopMotors();
            currentStatus = STATUS_ROUTE_COMPLETED;
            lastReferenceName = "Destino";
            break;
          }
        }
      }
    }
  }

  // Periodic Telemetry Transmission
  unsigned long currentMillis = millis();
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = currentMillis;
    sendTelemetry();
  }
}
