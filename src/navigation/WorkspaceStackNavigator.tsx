import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WorkspaceStackParamList } from '../types/navigation';
import WorkspacesScreen from '../screens/workspaces/WorkspacesScreen';
import MembersListScreen from '../screens/workspaces/MembersListScreen';

const Stack = createNativeStackNavigator<WorkspaceStackParamList>();

export default function WorkspaceStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="WorkspacesList"
        component={WorkspacesScreen}
      />
      <Stack.Screen
        name="MembersList"
        component={MembersListScreen}
      />
    </Stack.Navigator>
  );
}
