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
      { id: "n_web3", label: "Web3 & Blockchain", type: "topic", connectionsCount: 38 },
      { id: "n_agents", label: "AI Agents", type: "topic", connectionsCount: 24 },
      { id: "n_proof", label: "Proof of Creation", type: "topic", connectionsCount: 19 },
      { id: "n_user_abhay", label: "Abhay (You)", type: "person", reputationScore: 140, connectionsCount: 15 },
      { id: "n_user_rahul", label: "Rahul Sharma", type: "person", reputationScore: 185, connectionsCount: 22 },
      { id: "n_user_sarah", label: "Sarah Jenkins", type: "person", reputationScore: 160, connectionsCount: 18 },
      { id: "n_post_1", label: "Demystifying AI Agents & Decentralized Workflows", type: "post", connectionsCount: 8 },
    ];
  },

  getEdges(): GraphEdge[] {
    return [
      { from: "n_user_abhay", to: "n_ai", label: "Discussed" },
      { from: "n_user_abhay", to: "n_web3", label: "Posted" },
      { from: "n_ai", to: "n_agents", label: "Related" },
      { from: "n_web3", to: "n_proof", label: "Related" },
      { from: "n_user_rahul", to: "n_web3", label: "Discussed" },
      { from: "n_user_sarah", to: "n_agents", label: "Commented" },
      { from: "n_post_1", to: "n_agents", label: "Related" },
    ];
  },
};
