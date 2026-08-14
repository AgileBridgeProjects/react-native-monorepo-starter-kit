FROM mcr.microsoft.com/dotnet/runtime:10.0 AS base
RUN apt-get -o Acquire::Retries=3 update \
    && apt-get install -y --no-install-recommends libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*
USER $APP_UID
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["src/StarterKit.Data/StarterKit.Data.csproj", "src/StarterKit.Data/"]
COPY ["src/StarterKit.Migrator/StarterKit.Migrator.csproj", "src/StarterKit.Migrator/"]
RUN dotnet restore "./src/StarterKit.Migrator/StarterKit.Migrator.csproj"
COPY . .
WORKDIR "/src/src/StarterKit.Migrator"
RUN dotnet build "./StarterKit.Migrator.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./StarterKit.Migrator.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "StarterKit.Migrator.dll"]
