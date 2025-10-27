import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AuthScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

// Workspace Stack (for Workspaces tab)
export type WorkspaceStackParamList = {
  WorkspacesList: undefined;
  MembersList: { workspaceId: string };
};

export type WorkspaceStackNavigationProp = NativeStackNavigationProp<WorkspaceStackParamList>;

// Main Tab Navigator
export type MainTabParamList = {
  Dashboard: undefined;
  Despesas: undefined;
  Cartoes: undefined;
  Workspaces: undefined;
  Settings: undefined;
};

export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;

// Composite navigation prop for screens within Workspace Stack
export type WorkspaceScreenNavigationProp = CompositeNavigationProp<
  WorkspaceStackNavigationProp,
  MainTabNavigationProp
>;

// Root Stack (will be expanded in future phases)
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
