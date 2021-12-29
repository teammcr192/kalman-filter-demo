import './App.css';
import SimulationCanvas from './components/SimulationCanvas';
import SimulationControls from './components/SimulationControls';
import {
  initialSimulationState,
  Point,
  SimulationState,
  SimulationStateControls,
  updateSimulationStateControls,
} from './simulation/SimulationData';
import { useEffect, useRef, useState } from 'react';
import { getSimulatedMeasurementVector, runKalmanFilter } from './simulation/Simulation';

// How many times per second we run the Kalman Filter logic and update the position estimate.
// This is not necessarily the same as frame rate, as rendering may run at a different frequency.
const KALMAN_FILTER_UPDATE_FPS = 60;

// This is the sampling rate for user input, which is also disconnected from the framrate and does
// not rely on using event callbacks (which slows down the animation significantly).
const USER_INPUT_SAMPLING_RATE_FPS = 60;

const CANVAS_HEIGHT = 480;
const CANVAS_WIDTH = 720;

function App() {
  const [simulationState, setSimulationState] = useState<SimulationState>(initialSimulationState);
  const simulationStateRef = useRef<SimulationState>(simulationState);
  simulationStateRef.current = simulationState;

  useEffect(() => {
    if (simulationState.controls.isSimulationRunning) {
      const simulationStepInterval = setInterval(
        runSimulationStep,
        Math.round(1000 / KALMAN_FILTER_UPDATE_FPS)
      );
      return () => {
        clearInterval(simulationStepInterval);
      };
    }
  }, [simulationState.controls.isSimulationRunning]);

  function runSimulationStep(): void {
    const currentSimulationState = simulationStateRef.current;
    const { predictedState, predictedCovariance, predictedFutureState } =
      runKalmanFilter(currentSimulationState);
    setSimulationState({
      ...currentSimulationState,
      predictedState,
      predictedCovariance,
      predictedFutureState,
    });
  }

  function onSimulationControlsChanged(updatedControls: Partial<SimulationStateControls>): void {
    setSimulationState(updateSimulationStateControls(simulationState, updatedControls));
  }

  function onCursorPositionChanged(newPosition: Point): void {
    const currentSimulationState = simulationStateRef.current;
    const { sensorReadings } = currentSimulationState;
    const newMeasurementVector = getSimulatedMeasurementVector(
      currentSimulationState,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      newPosition,
      sensorReadings.previousMeasurementVector
    );
    setSimulationState({
      ...currentSimulationState,
      realCursorPosition: newPosition,
      sensorReadings: {
        measurementVector: newMeasurementVector,
        previousMeasurementVector: sensorReadings.measurementVector,
      },
    });
  }

  return (
    <div className="App">
      <SimulationCanvas
        canvasHeight={CANVAS_HEIGHT}
        canvasWidth={CANVAS_WIDTH}
        simulationState={simulationState}
        userInputSamplingRateFPS={USER_INPUT_SAMPLING_RATE_FPS}
        onCursorPositionChanged={onCursorPositionChanged}
      />
      <SimulationControls
        panelWidth={CANVAS_WIDTH}
        simulationState={simulationState}
        onSimulationControlsChanged={onSimulationControlsChanged}
      />
    </div>
  );
}

export default App;
