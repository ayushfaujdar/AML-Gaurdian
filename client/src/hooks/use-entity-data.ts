import { useQuery } from "@tanstack/react-query";
import { Entity, EntityRelationship } from "@/types";
import { useDashboard } from "@/context/dashboard-context";

interface NetworkData {
  centralEntity: Entity;
  relationships: EntityRelationship[];
  relatedEntities: Entity[];
}

export function useEntityData(entityId?: string) {
  const { filterOptions } = useDashboard();

  // Query all entities
  const entitiesQuery = useQuery<Entity[]>({
    queryKey: ["/api/entities"],
    staleTime: 60 * 1000, // 1 minute
    retry: 3,
    refetchOnWindowFocus: true,
  });

  // Query entity network data for a specific entity
  const networkDataQuery = useQuery<NetworkData>({
    queryKey: [`/api/entity-network/${entityId}`],
    enabled: !!entityId,
    retry: 3,
    refetchOnWindowFocus: true,
  });

  // Query entity relationships
  const relationshipsQuery = useQuery<EntityRelationship[]>({
    queryKey: [`/api/entity-relationships`],
    enabled: !entityId, // Only fetch all relationships when not looking at specific entity
    retry: 3,
    refetchOnWindowFocus: true,
  });

  // Query entity relationships for a specific entity
  const entityRelationshipsQuery = useQuery<EntityRelationship[]>({
    queryKey: [`/api/entity-relationships`, entityId],
    enabled: !!entityId,
    retry: 3,
    refetchOnWindowFocus: true,
  });

  // Filter entities by risk level if specified
  const filteredEntities = entitiesQuery.data && filterOptions.riskLevel !== "all"
    ? entitiesQuery.data.filter(entity => entity.riskLevel === filterOptions.riskLevel)
    : entitiesQuery.data;
  
  // Extract refetch functions for all queries
  const { refetch: refetchEntities } = entitiesQuery;
  const { refetch: refetchNetworkData } = networkDataQuery;
  const { refetch: refetchRelationships } = relationshipsQuery;
  const { refetch: refetchEntityRelationships } = entityRelationshipsQuery;
  
  // Function to refetch all data
  const refetchAll = () => {
    refetchEntities();
    if (entityId) {
      refetchNetworkData();
      refetchEntityRelationships();
    } else {
      refetchRelationships();
    }
  };

  return {
    entities: filteredEntities,
    networkData: networkDataQuery.data,
    relationships: relationshipsQuery.data,
    entityRelationships: entityRelationshipsQuery.data,
    isLoading: entitiesQuery.isLoading || 
               (!!entityId && networkDataQuery.isLoading) || 
               (!!entityId && entityRelationshipsQuery.isLoading) || 
               (!entityId && relationshipsQuery.isLoading),
    error: entitiesQuery.error || 
           (!!entityId && networkDataQuery.error) || 
           (!!entityId && entityRelationshipsQuery.error) || 
           (!entityId && relationshipsQuery.error),
    refetch: refetchAll,
    queries: {
      entitiesQuery,
      networkDataQuery,
      relationshipsQuery,
      entityRelationshipsQuery
    }
  };
}
