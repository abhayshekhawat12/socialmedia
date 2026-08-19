export interface GraphNode {
  id: string;
  label: string;
  type: "topic" | "person" | "post" | "community";
  reputationScore?: number;
  connectionsCount: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: "Posted" | "Commented" | "Discussed" | "Related" | "Follows";
}

export const trustGraphService = {
  getNodes(): GraphNode[] {
    return [
      { id: "n_ai", label: "Artificial Intelligence", type: "topic", connectionsCount: 42 },
      { id: "n_design", label: "UI & Product Design", type: "topic", connectionsCount: 38 },
      { id: "n_music", label: "Sound & Music", type: "topic", connectionsCount: 24 },
      { id: "n_photo", label: "Photography & Travel", type: "topic", connectionsCount: 19 },
      { id: "n_user_abhay", label: "Abhay (You)", type: "person", reputationScore: 140, connectionsCount: 15 },
      { id: "n_user_rahul", label: "Rahul Sharma", type: "person", reputationScore: 185, connectionsCount: 22 },
      { id: "n_user_sarah", label: "Sarah Jenkins", type: "person", reputationScore: 160, connectionsCount: 18 },
      { id: "n_post_1", label: "Building Engaging Social Communities", type: "post", connectionsCount: 8 },
    ];
  },

  getEdges(): GraphEdge[] {
    return [
      { from: "n_user_abhay", to: "n_ai", label: "Discussed" },
      { from: "n_user_abhay", to: "n_design", label: "Posted" },
      { from: "n_ai", to: "n_photo", label: "Related" },
      { from: "n_design", to: "n_photo", label: "Related" },
      { from: "n_user_rahul", to: "n_music", label: "Discussed" },
      { from: "n_user_sarah", to: "n_design", label: "Commented" },
      { from: "n_post_1", to: "n_ai", label: "Related" },
    ];
  },
};
