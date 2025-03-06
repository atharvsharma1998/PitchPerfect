# Vocal Practice App

A React Native application that helps users practice their singing by providing real-time pitch detection and feedback. Built with Expo and NativeWind.

## Features

- 🎵 Select notes to practice from C4 to C5
- 🎯 Real-time pitch detection and visualization
- 📊 Visual feedback with pitch graph
- 🎤 Recording capability for practice sessions
- 🔄 Practice mode with reference notes
- 💡 Instant feedback on pitch accuracy
- 👆 Long-press notes to hear reference tones

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npx expo start
   ```

3. Run on your device:
   - Scan QR code with Expo Go (iOS/Android)
   - Press 'a' for Android emulator
   - Press 'i' for iOS simulator

## Usage

1. **Select Notes**: Tap notes you want to practice
2. **Practice Mode**: 
   - Press "Live Practice" to start practicing with reference notes
   - Long-press any note to hear how it should sound
3. **Recording**: 
   - Use "Record Practice" to save your practice session
   - Review recordings to track progress

## Technical Stack

- React Native with Expo
- NativeWind (Tailwind CSS for React Native)
- Expo AV for audio handling
- React Native Chart Kit for visualizations
- Pitchfinder for pitch detection

## Requirements

- Node.js 14+
- Expo CLI
- iOS/Android device or emulator

## Development

This project uses:
- TypeScript for type safety
- NativeWind for styling
- Expo AV for audio processing
- File-based routing

## License

MIT

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
