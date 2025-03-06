import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { LineChart } from 'react-native-chart-kit';
import * as Pitchfinder from 'pitchfinder';
import "../global.css"

interface Note {
  name: string;
  frequency: number;
  soundFile: any; // Reference to local audio file
}

const NOTES: Note[] = [
  { name: 'C4', frequency: 261.63, soundFile: require('../assets/notes/C3.mp3') },
  { name: 'D4', frequency: 293.66, soundFile: require('../assets/notes/D4.mp3') },
  { name: 'E4', frequency: 329.63, soundFile: require('../assets/notes/E4.mp3') },
  { name: 'F4', frequency: 349.23, soundFile: require('../assets/notes/F4.mp3') },
  { name: 'G4', frequency: 392.00, soundFile: require('../assets/notes/G4.mp3') },
  { name: 'A4', frequency: 440.00, soundFile: require('../assets/notes/A4.mp3') },
  { name: 'B4', frequency: 493.88, soundFile: require('../assets/notes/B4.mp3') },
  { name: 'C5', frequency: 523.25, soundFile: require('../assets/notes/C5.mp3') },
];

const PITCH_DETECTION_INTERVAL = 100; // ms
const FREQUENCY_TOLERANCE = 5; // Hz
const SAMPLE_RATE = 44100;

// Add proper type for the detector
type PitchDetector = (input: Float32Array) => number | null;

const PRACTICE_INTERVAL = 2000; // 2 seconds between notes

interface PitchDataPoint {
  timestamp: number;
  frequency: number;
  note: string;
}

export default function App() {
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<number | null>(null);
  const [pitchData, setPitchData] = useState<PitchDataPoint[]>([]);
  const [feedback, setFeedback] = useState('');
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [practiceTimer, setPracticeTimer] = useState<NodeJS.Timeout | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [detector, setDetector] = useState<PitchDetector | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    setupAudio();
    
    // Initialize the detector with proper error handling
    try {
      const pitchDetector = Pitchfinder.YIN({ sampleRate: SAMPLE_RATE });
      setDetector(() => pitchDetector); // Using function form of setState
    } catch (error) {
      console.error('Failed to initialize pitch detector:', error);
      Alert.alert('Error', 'Failed to initialize pitch detector');
    }

    // Cleanup function
    return () => {
      if (practiceTimer) {
        clearInterval(practiceTimer);
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const setupAudio = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
      Alert.alert('Error', 'Failed to setup audio');
    }
  };

  const toggleNote = (noteName: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteName)) {
      newSelected.delete(noteName);
    } else {
      newSelected.add(noteName);
    }
    setSelectedNotes(newSelected);
  };

  const playReferenceNote = async (note: Note) => {
    try {
      const { sound } = await Audio.Sound.createAsync(note.soundFile);
      await sound.playAsync();
      // Unload sound after playing
      sound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          await sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error playing reference note:', error);
      Alert.alert('Error', 'Failed to play reference note');
    }
  };

  const analyzePitch = (buffer: Float32Array) => {
    // Safe guards to prevent errors
    if (!detector || !buffer || buffer.length === 0) {
      return;
    }

    try {
      const pitch = detector(buffer);
      
      if (pitch && !Number.isNaN(pitch) && pitch > 50 && pitch < 2000) {
        // Filter out unreasonable pitch values
        setCurrentPitch(pitch);
        setPitchData(prev => [...prev, { timestamp: Date.now(), frequency: pitch, note: '' }].slice(-50));

        // Find closest note
        const closestNote = NOTES.reduce((prev, curr) => {
          return Math.abs(curr.frequency - pitch) < Math.abs(prev.frequency - pitch) ? curr : prev;
        });

        // Check if the pitch is within tolerance of any selected note
        if (selectedNotes.has(closestNote.name) && 
            Math.abs(closestNote.frequency - pitch) <= FREQUENCY_TOLERANCE) {
          setFeedback(`Perfect! You're hitting ${closestNote.name}`);
        } else {
          setFeedback(`Try to match ${closestNote.name}`);
        }
      }
    } catch (error) {
      console.error('Error analyzing pitch:', error);
    }
  };

  // Mock function to generate test audio data - for development purposes
  const generateTestAudioData = () => {
    // Generate a simple sine wave at 440Hz (A4)
    const sampleRate = SAMPLE_RATE;
    const duration = 0.1; // 100ms
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);
    
    // Choose a frequency from the selected notes, or default to A4
    let frequency = 440;
    if (selectedNotes.size > 0) {
      const selectedNotesList = Array.from(selectedNotes);
      const randomNote = selectedNotesList[Math.floor(Math.random() * selectedNotesList.length)];
      const noteObj = NOTES.find(n => n.name === randomNote);
      if (noteObj) {
        frequency = noteObj.frequency;
      }
    }
    
    for (let i = 0; i < numSamples; i++) {
      buffer[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }
    return buffer;
  };

  const processAudioData = async (recording: Audio.Recording) => {
    try {
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        // For development, use test data since we can't directly access audio buffer in Expo
        const audioBuffer = generateTestAudioData();
        analyzePitch(audioBuffer);
      }
    } catch (error) {
      console.error('Error processing audio data:', error);
    }
  };

  const startPracticeMode = async () => {
    if (selectedNotes.size === 0) {
      Alert.alert('Please select notes to practice');
      return;
    }

    setIsPracticing(true);
    setStartTime(Date.now());
    setPitchData([]); // Clear previous data

    const selectedNotesList = Array.from(selectedNotes)
      .map(name => NOTES.find(n => n.name === name))
      .filter((note): note is Note => note !== undefined);

    let noteIndex = 0;

    // Play notes sequence
    const playNextNote = async () => {
      const note = selectedNotesList[noteIndex];
      try {
        if (sound) {
          await sound.unloadAsync();
        }
        const { sound: newSound } = await Audio.Sound.createAsync(
          note.soundFile,
          { shouldPlay: true }
        );
        setSound(newSound);
        setCurrentNote(note);
        
        newSound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) {
            noteIndex = (noteIndex + 1) % selectedNotesList.length;
            playNextNote();
          }
        });
      } catch (error) {
        console.error('Error playing note:', error);
      }
    };

    playNextNote();

    // Real-time pitch detection simulation
    const detectionTimer = setInterval(() => {
      if (currentNote) {
        const now = Date.now();
        const elapsedTime = (now - startTime) / 1000; // Convert to seconds
        
        // Simulate pitch detection (replace with real pitch detection)
        const randomOffset = (Math.random() - 0.5) * 20;
        const detectedPitch = currentNote.frequency + randomOffset;
        
        // Find closest note to the detected pitch
        const closestNote = NOTES.reduce((prev, curr) => {
          return Math.abs(curr.frequency - detectedPitch) < Math.abs(prev.frequency - detectedPitch) 
            ? curr 
            : prev;
        });

        // Add new data point
        setPitchData(prev => [
          ...prev,
          {
            timestamp: elapsedTime,
            frequency: detectedPitch,
            note: closestNote.name
          }
        ].slice(-100)); // Keep last 100 points

        // Update feedback
        const difference = Math.abs(detectedPitch - currentNote.frequency);
        setFeedback(
          difference < 10 
            ? `Great! Matching ${currentNote.name}` 
            : `Try to match ${currentNote.name}`
        );
      }
    }, 100); // Update every 100ms

    setPracticeTimer(detectionTimer);
  };

  const stopPractice = async () => {
    setIsPracticing(false);
    
    // Clear the practice timer
    if (practiceTimer) {
      clearInterval(practiceTimer);
      setPracticeTimer(null);
    }
    
    // Stop and unload the current sound
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    
    setCurrentNote(null);
    setFeedback('');
    setPitchData([]);
  };

  const startRecording = async () => {
    try {
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      setRecording(recording);
      setIsRecording(true);
      
      // Start practice mode while recording
      startPracticeMode();
    } catch (error) {
      console.error('Failed to start recording', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        setIsRecording(false);
        
        // Stop practice mode
        stopPractice();
        
        // Alert user that recording was saved
        Alert.alert(
          'Recording Saved',
          `Your practice session has been saved${uri ? ` at ${uri}` : ''}`
        );
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold mb-4">Vocal Practice App</Text>
      
      <ScrollView className="mb-4">
        <Text className="text-lg font-semibold mb-2">Select Notes to Practice:</Text>
        <View className="flex-row flex-wrap">
          {NOTES.map((note) => (
            <TouchableOpacity
              key={note.name}
              onPress={() => toggleNote(note.name)}
              onLongPress={() => playReferenceNote(note)}
              className={`m-1 p-3 rounded-lg ${
                selectedNotes.has(note.name) ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            >
              <Text className={`${
                selectedNotes.has(note.name) ? 'text-white' : 'text-black'
              }`}>
                {note.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-sm text-gray-500 mt-2">
          Tap to select/deselect. Long press to hear the note.
        </Text>
      </ScrollView>

      <View className="flex-row justify-center space-x-4 mb-4">
        <TouchableOpacity
          onPress={isPracticing ? stopPractice : startPracticeMode}
          className={`px-6 py-3 rounded-lg ${isPracticing ? 'bg-red-500' : 'bg-green-500'}`}
        >
          <Text className="text-white font-semibold">
            {isPracticing ? 'Stop Practice' : 'Live Practice'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={isRecording ? stopRecording : startRecording}
          className={`px-6 py-3 rounded-lg ${isRecording ? 'bg-red-500' : 'bg-blue-500'}`}
        >
          <Text className="text-white font-semibold">
            {isRecording ? 'Stop Recording' : 'Record Practice'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Status indicator */}
      {isRecording && (
        <View className="items-center mb-2">
          <Text className="text-red-500 font-semibold">Recording in progress...</Text>
        </View>
      )}

      {/* Current Pitch Display */}
      {currentPitch && (
        <View className="items-center mb-2">
          <Text className="text-lg">Current Pitch: {currentPitch.toFixed(1)} Hz</Text>
        </View>
      )}

      {/* Pitch Visualization */}
      {pitchData.length > 0 && (
        <View className="bg-white rounded-lg p-2 mb-4">
          <LineChart
            data={{
              labels: pitchData.slice(-20).map(d => d.timestamp.toFixed(1)),
              datasets: [{
                data: pitchData.slice(-20).map(d => d.frequency),
              }]
            }}
            width={320}
            height={220}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 100, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: { borderRadius: 16 },
              propsForVerticalLabels: { fontSize: 10, rotation: 0 },
              propsForHorizontalLabels: { fontSize: 10 }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </View>
      )}

      {/* Feedback Display */}
      <View className="items-center">
        <Text className={`text-xl ${
          feedback.includes('Perfect') ? 'text-green-500' : 'text-red-500'
        }`}>
          {feedback}
        </Text>
      </View>
    </View>
  );
}