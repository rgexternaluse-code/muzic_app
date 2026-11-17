import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: [
      'dist/**/*',
      'node_modules/**/*',
      'android/**/*',
      'ios/**/*',
      'src/**/*',
      'scripts/**/*'
    ]
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
